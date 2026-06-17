import axios from 'axios';
import { ApifyClient } from 'apify-client';
import LeadPost from '../models/lead-post.model';
import ApifyKey from '../models/apify-key.model';
import { getSetting } from './setting.service';
import ErrorResponse from '../utils/error-response.utils';
import { recordContactCompassLookup } from '../utils/contact-compass-usage.utils';
import { scrapeLinkedInAuthorProfile } from './linkedin-profile-enrichment.service';
import {
    extractEmailFromText,
    extractLinkedInPublicId,
    extractPhoneFromText,
    isVerifiedEmailStatus,
    type EmailStatus,
} from '../utils/lead-enrichment.utils';
import {
    guessWorkEmails,
    parsePersonName,
    pickBestGuessedEmail,
} from '../utils/email-pattern.utils';
import { runEmailVerification } from '../utils/email-verification.utils';

type EmailSource = 'post_text' | 'apify_profile' | 'contact_compass' | 'pattern_guess' | 'threads_profile';

async function getActiveApifyKey() {
    const keyRecord = await ApifyKey.findOne({ is_active: true, is_deleted: false });
    return keyRecord ? keyRecord.key : null;
}

async function findThreadsContact(lead: any) {
    const url = lead.author?.url || lead.url;
    const usernameMatch = url.match(/threads\.net\/@([^/?#]+)/);
    if (!usernameMatch) return null;

    const apiKey = await getActiveApifyKey();
    if (!apiKey) throw new ErrorResponse('No active Apify key found for Threads enrichment', 400);

    const client = new ApifyClient({ token: apiKey });
    const run = await client.actor('apify/threads-profile-api-scraper').call({
        usernames: [usernameMatch[1]],
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    if (!items?.length) return null;

    const profile = items[0] as any;
    let email = extractEmailFromText(profile.biography || '');
    let phone = extractPhoneFromText(profile.biography || '');

    const website = profile.external_url || profile.website;
    if (website && (!email || !phone)) {
        try {
            const webResponse = await axios.get(website, { timeout: 10000 });
            if (typeof webResponse.data === 'string') {
                email = email || extractEmailFromText(webResponse.data);
                phone = phone || extractPhoneFromText(webResponse.data);
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
            username: profile.username,
            website,
        },
    };
}

async function lookupContactCompass(publicId: string) {
    const token = await getSetting('contact_compass_token');
    if (!token) return null;

    const response = await axios.post(
        'https://api.contactcompass.io/v1/people/search',
        { filters: { linkedin_public_id: publicId } },
        {
            headers: {
                'Content-Type': 'application/json',
                'x-api-token': token,
            },
        }
    );

    const data = response.data;
    await recordContactCompassLookup(data.result?.credits_left);

    if (!data.success || !data.result?.people?.length) return null;

    return data.result.people[0];
}

async function applyContactUpdate(
    lead: any,
    update: {
        email?: string | null;
        phone?: string | null;
        email_status?: EmailStatus | string;
        email_source?: EmailSource;
        contact_info?: Record<string, any>;
        message: string;
    }
) {
    let email = update.email || null;
    let emailStatus = update.email_status;
    let message = update.message;

    if (email) {
        const verification = await runEmailVerification(
            email,
            String(update.email_status || ''),
            update.email_source || ''
        );
        emailStatus = verification.email_status;
        if (verification.verification_note) {
            message = verification.verification_note;
        }
        if (emailStatus === 'invalid') {
            email = null;
            message = verification.verification_note || 'Email rejected by verification.';
        }
    }

    if (email) lead.email = email;
    if (update.phone) {
        lead.contact_info = {
            ...lead.contact_info,
            phone_numbers: [{ number: update.phone, type: 'work' }],
        };
    }

    lead.contact_info = {
        ...lead.contact_info,
        ...update.contact_info,
        email_status: emailStatus || lead.contact_info?.email_status,
        email_source: update.email_source || lead.contact_info?.email_source,
        verification_note: message,
        email_verified_at: isVerifiedEmailStatus(String(emailStatus)) ? new Date().toISOString() : lead.contact_info?.email_verified_at,
    };

    await lead.save();

    return {
        success: !!email || !!update.phone,
        data: lead,
        message,
    };
}

export async function verifyLeadEmailManually(leadId: string) {
    const lead = await LeadPost.findById(leadId);
    if (!lead) {
        throw new ErrorResponse('Lead not found', 404);
    }
    if (!lead.email) {
        throw new ErrorResponse('No email on this lead to verify.', 400);
    }

    lead.contact_info = {
        ...lead.contact_info,
        email_status: 'verified',
        verification_note: 'Manually verified by admin.',
        email_verified_at: new Date().toISOString(),
    };
    await lead.save();

    await LeadPost.findByIdAndUpdate(leadId, {
        enrichment_status: 'found',
        enrichment_message: 'Email manually verified by admin.',
        enriched_at: new Date(),
    });

    return lead;
}

export const findLeadEmail = async (leadId: string) => {
    const lead = await LeadPost.findById(leadId);
    if (!lead) {
        throw new ErrorResponse('Lead not found', 404);
    }

    if (lead.platform !== 'linkedin' && lead.platform !== 'threads') {
        throw new ErrorResponse('Email finding only supported for LinkedIn and Threads leads', 400);
    }

    if (lead.email && isVerifiedEmailStatus(lead.contact_info?.email_status)) {
        return {
            success: true,
            data: lead,
            message: 'Lead already has a verified email.',
        };
    }

    const authorUrl = lead.author?.url;
    let publicId =
        lead.contact_info?.linkedin_public_id ||
        extractLinkedInPublicId([authorUrl, lead.url]);

    // Step 1 — post text (most authentic)
    const emailInContent = extractEmailFromText(lead.content);
    const phoneInContent = extractPhoneFromText(lead.content);
    if (emailInContent || phoneInContent) {
        return applyContactUpdate(lead, {
            email: emailInContent,
            phone: phoneInContent,
            email_status: emailInContent ? 'verified' : undefined,
            email_source: emailInContent ? 'post_text' : undefined,
            contact_info: { linkedin_public_id: publicId || undefined },
            message: emailInContent
                ? 'Verified email found in post content.'
                : 'Phone found in post content.',
        });
    }

    // Threads path
    if (lead.platform === 'threads') {
        const contact = await findThreadsContact(lead);
        if (!contact) {
            throw new ErrorResponse('Could not find contact details for this Threads profile', 404);
        }

        return applyContactUpdate(lead, {
            email: contact.email,
            phone: contact.phone,
            email_status: contact.email ? 'unverified' : undefined,
            email_source: contact.email ? 'threads_profile' : undefined,
            contact_info: {
                name: contact.profile_info?.name,
                headline: contact.profile_info?.bio,
                linkedin_public_id: contact.profile_info?.username,
            },
            message: contact.email
                ? 'Email found via Threads profile (review recommended).'
                : 'Profile found but no email on Threads.',
        });
    }

    let profileData = null;

    // Step 2 — Apify LinkedIn profile
    if (authorUrl?.includes('linkedin.com/in/')) {
        profileData = await scrapeLinkedInAuthorProfile(authorUrl);
        publicId = publicId || profileData?.linkedin_public_id || null;

        if (profileData?.email) {
            return applyContactUpdate(lead, {
                email: profileData.email,
                phone: profileData.phone,
                email_status: 'unverified',
                email_source: 'apify_profile',
                contact_info: {
                    name: profileData.name,
                    first_name: profileData.first_name,
                    last_name: profileData.last_name,
                    headline: profileData.headline,
                    company_name: profileData.company_name,
                    linkedin_public_id: publicId || undefined,
                    company_domain: profileData.company_domain,
                },
                message: 'Email found on LinkedIn profile via Apify (review recommended).',
            });
        }

        if (profileData) {
            lead.contact_info = {
                ...lead.contact_info,
                name: profileData.name || lead.contact_info?.name,
                first_name: profileData.first_name,
                last_name: profileData.last_name,
                headline: profileData.headline || lead.contact_info?.headline,
                company_name: profileData.company_name || lead.contact_info?.company_name,
                linkedin_public_id: publicId || lead.contact_info?.linkedin_public_id,
                company_domain: profileData.company_domain,
            };
        }
    }

    // Step 3 — Contact Compass (verified business email)
    if (publicId) {
        try {
            const person = await lookupContactCompass(publicId);
            if (person?.email) {
                const ccStatus = person.email_status?.toLowerCase?.() || 'verified';
                return applyContactUpdate(lead, {
                    email: person.email,
                    email_status: isVerifiedEmailStatus(ccStatus) ? 'verified' : 'unverified',
                    email_source: 'contact_compass',
                    contact_info: {
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
                        credits_left: person.credits_left,
                    },
                    message: isVerifiedEmailStatus(ccStatus)
                        ? 'Verified business email found via Contact Compass.'
                        : 'Email found via Contact Compass (unverified status).',
                });
            }
        } catch (error: any) {
            console.error('Contact Compass API Error:', error.response?.data || error.message);
            if (error.response?.status === 401) {
                throw new ErrorResponse('Invalid Contact Compass API token', 401);
            }
        }
    }

    // Step 4 — pattern guess (last resort)
    const domain = profileData?.company_domain || lead.contact_info?.company_domain;
    const personName = parsePersonName(
        profileData?.name || lead.contact_info?.name || lead.author?.name
    );

    if (domain && personName) {
        const guessed = pickBestGuessedEmail(
            guessWorkEmails(personName.first, personName.last, domain)
        );

        if (guessed) {
            await lead.save();
            return applyContactUpdate(lead, {
                email: guessed,
                email_status: 'guessed',
                email_source: 'pattern_guess',
                contact_info: {
                    company_domain: domain,
                },
                message: `Guessed work email from name + ${domain}. Verify before sending.`,
            });
        }
    }

    // Profile info only
    if (profileData || publicId) {
        await lead.save();
        return {
            success: false,
            data: lead,
            message: publicId
                ? 'Profile enriched but no email found across all sources.'
                : 'Could not extract LinkedIn profile ID for email lookup.',
        };
    }

    throw new ErrorResponse('Could not extract LinkedIn public ID from author profile URL', 400);
};
