import axios from 'axios';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { ApifyClient } from 'apify-client';
import LeadPost from '../models/lead-post.model';
import ApifyKey from '../models/apify-key.model';
import { getSetting } from './setting.service';
import ErrorResponse from '../utils/error-response.utils';

const extractEmailFromText = (text: string) => {
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    const match = text.match(emailRegex);
    return match ? match[0] : null;
};

const extractPhoneFromText = (text: string) => {
    // Look for potential phone numbers
    const phoneRegex = /(\+?\d[\d\s\-\(\)]{7,}\d)/g;
    const matches = text.match(phoneRegex);
    if (matches) {
        for (const match of matches) {
            const phoneNumber = parsePhoneNumberFromString(match);
            if (phoneNumber && phoneNumber.isValid()) {
                return phoneNumber.formatInternational();
            }
        }
    }
    return null;
};

const getActiveApifyKey = async () => {
    const keyRecord = await ApifyKey.findOne({ is_active: true, is_deleted: false });
    return keyRecord ? keyRecord.key : null;
};

const findThreadsContact = async (lead: any) => {
    // 1. Extract username from author.url
    const url = lead.author?.url || lead.url;
    const usernameMatch = url.match(/threads\.net\/@([^/?#]+)/);
    if (!usernameMatch) return null;
    const username = usernameMatch[1];

    const apiKey = await getActiveApifyKey();
    if (!apiKey) throw new ErrorResponse('No active Apify key found for Threads enrichment', 400);

    const client = new ApifyClient({ token: apiKey });
    
    // 2. Run threads-profile-api-scraper
    const run = await client.actor('apify/threads-profile-api-scraper').call({
        usernames: [username]
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    if (!items || items.length === 0) return null;

    const profile = items[0] as any;
    
    // 3. Check bio
    let email = extractEmailFromText(profile.biography || '');
    let phone = extractPhoneFromText(profile.biography || '');

    // 4. If not found, check website link
    const website = profile.external_url || profile.website || (profile.biography && profile.biography.match(/https?:\/\/[^\s]+/)?.[0]);

    if (website && (!email || !phone)) {
        try {
            const webResponse = await axios.get(website, { timeout: 10000 });
            const webContent = webResponse.data;
            if (typeof webContent === 'string') {
                email = email || extractEmailFromText(webContent);
                phone = phone || extractPhoneFromText(webContent);
            }
        } catch (err) {
            console.error(`Failed to scrape website ${website}:`, err);
        }
    }

    return {
        email,
        phone,
        profile_info: {
            name: profile.full_name,
            bio: profile.biography,
            follower_count: profile.follower_count,
            username: profile.username,
            website
        }
    };
};

export const findLeadEmail = async (leadId: string) => {
    const lead = await LeadPost.findById(leadId);
    if (!lead) {
        throw new ErrorResponse('Lead not found', 404);
    }

    if (lead.platform !== 'linkedin' && lead.platform !== 'threads') {
        throw new ErrorResponse('Email finding only supported for LinkedIn and Threads leads', 400);
    }

    // Check if lead already has contact info to avoid redundant calls
    if (lead.email || (lead.contact_info?.phone_numbers && lead.contact_info.phone_numbers.length > 0)) {
        return {
            success: true,
            data: lead,
            message: 'Lead already has contact information'
        };
    }

    // Priority 1: Search in content using regex
    const emailInContent = extractEmailFromText(lead.content);
    const phoneInContent = extractPhoneFromText(lead.content);

    if (emailInContent || phoneInContent) {
        lead.email = emailInContent || lead.email;
        if (phoneInContent) {
            lead.contact_info = {
                ...lead.contact_info,
                phone_numbers: [{ number: phoneInContent, type: 'work' }]
            };
        }
        await lead.save();
        return { 
            success: true, 
            data: lead, 
            message: `Found contact details in post content: ${emailInContent || phoneInContent}` 
        };
    }

    // Handle Threads Leads
    if (lead.platform === 'threads') {
        const contact = await findThreadsContact(lead);
        if (!contact) {
            throw new ErrorResponse('Could not find contact details for this Threads profile', 404);
        }

        lead.email = contact.email || lead.email;
        if (contact.phone) {
            lead.contact_info = {
                ...lead.contact_info,
                phone_numbers: [{ number: contact.phone, type: 'work' }]
            };
        }
        
        if (contact.profile_info) {
            lead.contact_info = {
                ...lead.contact_info,
                name: contact.profile_info.name,
                headline: contact.profile_info.bio,
                linkedin_public_id: contact.profile_info.username // Using this field for username
            };
        }

        await lead.save();
        return {
            success: true,
            data: lead,
            message: contact.email || contact.phone ? 'Found contact details via Threads Profile' : 'Found profile info but no contact details'
        };
    }

    // Priority 2: Contact Compass API (LinkedIn Only)
    // Extract linkedin_public_id from URL if not already present
    let publicId = lead.contact_info?.linkedin_public_id;
    if (!publicId) {
        // Try to extract from lead URL or author URL
        const urlsToTry = [lead.url, lead.author?.url].filter(Boolean) as string[];
        
        for (const url of urlsToTry) {
            const match = url.match(/linkedin\.com\/in\/([^/?#]+)/);
            if (match) {
                publicId = match[1];
                break;
            }
        }
    }

    if (!publicId) {
        throw new ErrorResponse('Could not extract LinkedIn public ID from URL', 400);
    }

    const token = await getSetting('contact_compass_token');
    if (!token) {
        throw new ErrorResponse('Contact Compass API token not configured. Please add it in settings.', 400);
    }

    try {
        const response = await axios.post('https://api.contactcompass.io/v1/people/search', {
            filters: {
                linkedin_public_id: publicId
            }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-token': token
            }
        });

        const data = response.data;

        if (!data.success || !data.result?.people?.length) {
            return { success: false, message: 'No contact found for this lead' };
        }

        const person = data.result.people[0];
        
        // Update lead with found info
        lead.email = person.email;
        lead.contact_info = {
            name: person.name,
            first_name: person.first_name,
            last_name: person.last_name,
            title: person.title,
            headline: person.headline,
            city: person.city,
            country: person.country,
            state: person.state,
            company_name: person.company_name,
            phone_numbers: person.phone_numbers,
            linkedin_public_id: person.linkedin_public_id,
            email_status: person.email_status,
            credits_left: data.result.credits_left
        };

        await lead.save();

        return { success: true, data: lead };
    } catch (error: any) {
        console.error('Contact Compass API Error:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            throw new ErrorResponse('Invalid Contact Compass API token', 401);
        }
        throw new ErrorResponse('Failed to fetch contact details from provider', 500);
    }
};
