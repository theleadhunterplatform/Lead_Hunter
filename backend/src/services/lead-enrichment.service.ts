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
import { runDualEmailVerification, getDomainFromEmail, type FindSource } from '../utils/dual-email-verification.utils';
import { findEmailWithHunterMulti } from '../utils/hunter-api.utils';
import {
    buildEmailEntry,
    pickPrimaryEmailEntry,
    type LeadEmailEntry,
} from '../utils/lead-email-entry.utils';

type EmailSource =
    | 'post_text'
    | 'apify_profile'
    | 'contact_compass'
    | 'hunter_finder'
    | 'compass_and_hunter'
    | 'pattern_guess'
    | 'threads_profile';

interface EmailCandidate {
    email: string;
    sources: Array<'contact_compass' | 'hunter_finder'>;
    compassStatus?: string;
    hunterScore?: number;
    hunterFinderStatus?: string;
    contactInfo: Record<string, any>;
    message: string;
}

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
        found_by?: FindSource[];
        compass_status?: string | null;
        hunter_finder_status?: string | null;
        contact_info?: Record<string, any>;
        message: string;
    }
) {
    let email = update.email || null;
    let emailStatus = update.email_status;
    let message = update.message;

    if (email) {
        const verification = await runDualEmailVerification(email, {
            source: update.email_source,
            foundBy: update.found_by,
            compassStatus: update.compass_status,
            hunterFinderStatus: update.hunter_finder_status,
        });
        emailStatus = verification.email_status;
        const combinedNote = `${verification.find_note} ${verification.verification_note}`.trim();
        message = combinedNote;
        if (emailStatus === 'invalid') {
            email = null;
        } else {
            const entry = buildEmailEntry(
                email,
                verification,
                update.email_source || 'unknown'
            );
            entry.is_primary = true;
            lead.contact_info = {
                ...lead.contact_info,
                ...update.contact_info,
                emails: [entry],
                email_conflict: false,
                found_by: verification.found_by,
                verified_by: verification.verified_by,
                find_note: verification.find_note,
                email_status: emailStatus || lead.contact_info?.email_status,
                email_source: update.email_source || lead.contact_info?.email_source,
                verification_note: verification.verification_note,
                email_verified_at: isVerifiedEmailStatus(String(emailStatus))
                    ? new Date().toISOString()
                    : lead.contact_info?.email_verified_at,
            };
        }
    } else if (!email) {
        lead.contact_info = {
            ...lead.contact_info,
            ...update.contact_info,
            email_status: emailStatus || lead.contact_info?.email_status,
            email_source: update.email_source || lead.contact_info?.email_source,
            verification_note: message,
        };
    }

    if (email) lead.email = email;
    if (update.phone) {
        lead.contact_info = {
            ...lead.contact_info,
            phone_numbers: [{ number: update.phone, type: 'work' }],
        };
    }

    await lead.save();

    return {
        success: !!email || !!update.phone,
        data: lead,
        message,
        email_rejected: !!update.email && !email,
    };
}

function resolveEmailSource(sources: EmailCandidate['sources']): EmailSource {
    if (sources.includes('contact_compass') && sources.includes('hunter_finder')) {
        return 'compass_and_hunter';
    }
    if (sources.includes('contact_compass')) return 'contact_compass';
    return 'hunter_finder';
}

function rankCandidates(candidates: EmailCandidate[]): EmailCandidate[] {
    return [...candidates].sort((a, b) => {
        const scoreA = a.sources.length * 100 + (a.hunterScore || 0);
        const scoreB = b.sources.length * 100 + (b.hunterScore || 0);
        return scoreB - scoreA;
    });
}

function addHunterResultToMap(
    byEmail: Map<string, EmailCandidate>,
    hunterFound: { email: string; score: number; verificationStatus?: string; position?: string; company?: string },
    domain?: string,
    publicId?: string | null
) {
    const existing = byEmail.get(hunterFound.email);
    if (existing) {
        if (!existing.sources.includes('hunter_finder')) {
            existing.sources.push('hunter_finder');
        }
        existing.hunterScore = hunterFound.score;
        existing.hunterFinderStatus = hunterFound.verificationStatus;
        existing.message = 'Same email found by Contact Compass and Hunter.io.';
        if (hunterFound.position) existing.contactInfo.title = existing.contactInfo.title || hunterFound.position;
        if (hunterFound.company) existing.contactInfo.company_name = existing.contactInfo.company_name || hunterFound.company;
        return;
    }

    byEmail.set(hunterFound.email, {
        email: hunterFound.email,
        sources: ['hunter_finder'],
        hunterScore: hunterFound.score,
        hunterFinderStatus: hunterFound.verificationStatus,
        contactInfo: {
            company_name: hunterFound.company,
            title: hunterFound.position,
            company_domain: domain,
            linkedin_public_id: publicId || undefined,
        },
        message: `Email found via Hunter.io (score ${hunterFound.score}).`,
    });
}

async function collectDualFindCandidates(options: {
    publicId?: string | null;
    profileData?: any;
    lead: any;
}): Promise<EmailCandidate[]> {
    const { publicId, profileData, lead } = options;
    const byEmail = new Map<string, EmailCandidate>();

    const personName = parsePersonName(
        profileData?.name || lead.contact_info?.name || lead.author?.name
    );
    const domain = profileData?.company_domain || lead.contact_info?.company_domain;
    const company = profileData?.company_name || lead.contact_info?.company_name;

    const [compassPerson, hunterFound] = await Promise.all([
        publicId ? lookupContactCompass(publicId).catch((error: any) => {
            console.error('Contact Compass API Error:', error.response?.data || error.message);
            if (error.response?.status === 401) throw new ErrorResponse('Invalid Contact Compass API token', 401);
            return null;
        }) : Promise.resolve(null),
        findEmailWithHunterMulti({
            linkedinHandle: publicId || undefined,
            domain: domain || undefined,
            company: !domain ? company || undefined : undefined,
            firstName: personName?.first,
            lastName: personName?.last,
            fullName: personName ? undefined : profileData?.name || lead.contact_info?.name,
        }),
    ]);

    if (compassPerson?.email) {
        const email = String(compassPerson.email).toLowerCase();
        byEmail.set(email, {
            email,
            sources: ['contact_compass'],
            compassStatus: compassPerson.email_status,
            contactInfo: {
                name: compassPerson.name,
                first_name: compassPerson.first_name,
                last_name: compassPerson.last_name,
                title: compassPerson.title,
                headline: compassPerson.headline,
                city: compassPerson.city,
                country: compassPerson.country,
                state: compassPerson.state,
                company_name: compassPerson.company_name,
                phone_numbers: compassPerson.phone_numbers,
                linkedin_public_id: compassPerson.linkedin_public_id,
                credits_left: compassPerson.credits_left,
            },
            message: 'Email found via Contact Compass.',
        });

        const compassEmailDomain = getDomainFromEmail(email);
        const needsHunterRetry =
            !hunterFound?.email ||
            hunterFound.email.toLowerCase() !== email;

        if (needsHunterRetry) {
            const hunterRetry = await findEmailWithHunterMulti({
                domainFromEmail: compassEmailDomain || undefined,
                domain: domain || compassEmailDomain || undefined,
                company: compassPerson.company_name || company || undefined,
                firstName: compassPerson.first_name || personName?.first,
                lastName: compassPerson.last_name || personName?.last,
                fullName: compassPerson.name,
                linkedinHandle: publicId || undefined,
            });

            if (hunterRetry?.email) {
                addHunterResultToMap(byEmail, hunterRetry, domain || compassEmailDomain || undefined, publicId);
            }
        }
    }

    if (hunterFound?.email) {
        addHunterResultToMap(byEmail, hunterFound, domain, publicId);
    }

    return rankCandidates([...byEmail.values()]);
}

async function applyMultipleEmailCandidates(lead: any, candidates: EmailCandidate[]) {
    const entries: LeadEmailEntry[] = [];

    for (const candidate of candidates) {
        const verification = await runDualEmailVerification(candidate.email, {
            foundBy: candidate.sources,
            compassStatus: candidate.compassStatus,
            hunterFinderStatus: candidate.hunterFinderStatus,
        });

        if (verification.email_status === 'invalid') continue;

        entries.push(
            buildEmailEntry(
                candidate.email,
                verification,
                resolveEmailSource(candidate.sources)
            )
        );
    }

    if (entries.length === 0) {
        return {
            success: false,
            data: lead,
            message: 'All email candidates were rejected by verification.',
            email_rejected: true,
        };
    }

    const emailConflict = entries.length > 1;
    const primary = pickPrimaryEmailEntry(entries);
    primary.is_primary = true;

    const primaryCandidate = candidates.find((c) => c.email === primary.email);

    lead.email = primary.email;
    lead.contact_info = {
        ...lead.contact_info,
        ...(primaryCandidate?.contactInfo || {}),
        emails: entries,
        email_conflict: emailConflict,
        found_by: primary.found_by,
        verified_by: primary.verified_by,
        find_note: primary.find_note,
        email_status: primary.email_status,
        email_source: primary.email_source,
        verification_note: emailConflict
            ? 'Multiple different emails found. Review each candidate below.'
            : primary.verification_note,
        email_verified_at: isVerifiedEmailStatus(primary.email_status)
            ? new Date().toISOString()
            : lead.contact_info?.email_verified_at,
    };

    await lead.save();

    const message = emailConflict
        ? `Found ${entries.length} different emails from Contact Compass and Hunter.io.`
        : `${primary.find_note} ${primary.verification_note}`.trim();

    return {
        success: true,
        data: lead,
        message,
        email_rejected: false,
    };
}

async function tryDualFindCandidates(lead: any, candidates: EmailCandidate[]) {
    return applyMultipleEmailCandidates(lead, candidates);
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

export const findLeadEmail = async (leadId: string, options?: { force?: boolean }) => {
    const lead = await LeadPost.findById(leadId);
    if (!lead) {
        throw new ErrorResponse('Lead not found', 404);
    }

    if (lead.platform !== 'linkedin' && lead.platform !== 'threads') {
        throw new ErrorResponse('Email finding only supported for LinkedIn and Threads leads', 400);
    }

    if (!options?.force && lead.email && isVerifiedEmailStatus(lead.contact_info?.email_status)) {
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
        const result = await applyContactUpdate(lead, {
            email: emailInContent,
            phone: phoneInContent,
            email_source: emailInContent ? 'post_text' : undefined,
            contact_info: { linkedin_public_id: publicId || undefined },
            message: emailInContent
                ? 'Email found in post content.'
                : 'Phone found in post content.',
        });
        if (result.success || !emailInContent) return result;
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
            const result = await applyContactUpdate(lead, {
                email: profileData.email,
                phone: profileData.phone,
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
                message: 'Email found on LinkedIn profile via Apify.',
            });
            if (result.success) return result;
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

    // Steps 3 & 4 — Contact Compass + Hunter.io (dual find), then dual verify
    if (publicId || profileData || lead.contact_info?.company_domain) {
        try {
            const candidates = await collectDualFindCandidates({ publicId, profileData, lead });
            if (candidates.length > 0) {
                const result = await tryDualFindCandidates(lead, candidates);
                if (result?.success) return result;
            }
        } catch (error) {
            if (error instanceof ErrorResponse) throw error;
            console.error('[Enrichment] Dual find failed:', error);
        }
    }

    // Step 5 — pattern guess (last resort)
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
                email_source: 'pattern_guess',
                contact_info: {
                    company_domain: domain,
                },
                message: `Guessed work email from name + ${domain}.`,
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
