import axios from 'axios';
import { ApifyClient } from 'apify-client';
import LeadPost from '../models/lead-post.model';
import ApifyKey from '../models/apify-key.model';
import { getSetting } from './setting.service';
import ErrorResponse from '../utils/error-response.utils';
import { recordContactCompassLookup } from '../utils/contact-compass-usage.utils';
import { scrapeLinkedInAuthorProfile } from './linkedin-profile-enrichment.service';
import { findPhonesWithContactOut } from '../utils/contactout-api.utils';
import { findPhonesWithApollo } from '../utils/apollo-api.utils';
import {
    extractEmailFromText,
    extractPhoneFromText,
    isVerifiedEmailStatus,
    leadHasPhone,
    mergePhoneEntry,
    pickFirstPhone,
    resolveLinkedInPublicIdFromLead,
    type EmailStatus,
    type PhoneSource,
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
    | 'threads_profile'
    | 'contactout'
    | 'apollo';

const MAX_PAID_PHONE_LOOKUPS = parseInt(process.env.MAX_PAID_PHONE_LOOKUPS_PER_LEAD || '2', 10);

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

function keepCompassEmailOnRejection(
    verification: Awaited<ReturnType<typeof runDualEmailVerification>>,
    sources: EmailCandidate['sources']
) {
    if (verification.email_status !== 'invalid') return verification;
    if (!sources.includes('contact_compass')) return verification;

    return {
        ...verification,
        email_status: 'unverified' as const,
        verification_note: `${verification.verification_note} Kept as unverified (Contact Compass).`,
    };
}

async function applyContactUpdate(
    lead: any,
    update: {
        email?: string | null;
        phone?: string | null;
        phone_source?: PhoneSource;
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
        let verification = await runDualEmailVerification(email, {
            source: update.email_source,
            foundBy: update.found_by,
            compassStatus: update.compass_status,
            hunterFinderStatus: update.hunter_finder_status,
        });
        if (
            update.found_by?.includes('contact_compass') ||
            update.email_source === 'contact_compass' ||
            update.email_source === 'compass_and_hunter'
        ) {
            verification = keepCompassEmailOnRejection(verification, ['contact_compass']);
        }
        emailStatus = verification.email_status;
        const combinedNote = `${verification.find_note} ${verification.verification_note}`.trim();
        message = combinedNote;
        if (emailStatus === 'invalid') {
            email = null;
        }
        if (email) {
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
        const phoneMerge = mergePhoneEntry(
            lead.contact_info,
            update.phone,
            update.phone_source || 'post_text'
        );
        lead.contact_info = {
            ...lead.contact_info,
            ...phoneMerge,
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
        let verification = await runDualEmailVerification(candidate.email, {
            foundBy: candidate.sources,
            compassStatus: candidate.compassStatus,
            hunterFinderStatus: candidate.hunterFinderStatus,
        });
        verification = keepCompassEmailOnRejection(verification, candidate.sources);

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

async function tryPaidPhoneLookup(
    linkedinUrl: string,
    paidLookupsUsed: { count: number }
): Promise<{ phone: string | null; email: string | null; source: PhoneSource | null; contactInfo: Record<string, any> }> {
    if (!linkedinUrl?.includes('linkedin.com/in/')) {
        return { phone: null, email: null, source: null, contactInfo: {} };
    }

    if (paidLookupsUsed.count < MAX_PAID_PHONE_LOOKUPS) {
        const contactOut = await findPhonesWithContactOut(linkedinUrl);
        paidLookupsUsed.count += 1;
        if (contactOut?.phones?.length || contactOut?.emails?.length) {
            return {
                phone: pickFirstPhone(...contactOut.phones),
                email: contactOut.emails[0] || null,
                source: 'contactout',
                contactInfo: contactOut.contactInfo,
            };
        }
    }

    if (paidLookupsUsed.count < MAX_PAID_PHONE_LOOKUPS) {
        const apollo = await findPhonesWithApollo(linkedinUrl);
        paidLookupsUsed.count += 1;
        if (apollo?.phones?.length || apollo?.emails?.length) {
            return {
                phone: pickFirstPhone(...apollo.phones),
                email: apollo.emails[0] || null,
                source: 'apollo',
                contactInfo: apollo.contactInfo,
            };
        }
    }

    return { phone: null, email: null, source: null, contactInfo: {} };
}

function hasVerifiedEmail(lead: any): boolean {
    return Boolean(lead.email && isVerifiedEmailStatus(lead.contact_info?.email_status));
}

function enrichmentComplete(lead: any): boolean {
    return hasVerifiedEmail(lead) || leadHasPhone(lead);
}

export const findLeadEmail = async (leadId: string, options?: { force?: boolean }) => {
    let lead = await LeadPost.findById(leadId);
    if (!lead) {
        throw new ErrorResponse('Lead not found', 404);
    }

    if (lead.platform !== 'linkedin' && lead.platform !== 'threads') {
        throw new ErrorResponse('Contact finding only supported for LinkedIn and Threads leads', 400);
    }

    if (!options?.force && hasVerifiedEmail(lead) && leadHasPhone(lead)) {
        return {
            success: true,
            data: lead,
            message: 'Lead already has verified email and phone.',
        };
    }

    const authorUrl = lead.author?.url;
    let publicId = resolveLinkedInPublicIdFromLead(lead);
    const paidLookupsUsed = { count: 0 };
    let lastMessage = 'Contact enrichment completed.';

    // Step 1 — post text (phone-first: never stop here if only email)
    const emailInContent = extractEmailFromText(lead.content);
    const phoneInContent = extractPhoneFromText(lead.content);
    if (emailInContent || phoneInContent) {
        const result = await applyContactUpdate(lead, {
            email: emailInContent,
            phone: phoneInContent,
            phone_source: phoneInContent ? 'post_text' : undefined,
            email_source: emailInContent ? 'post_text' : undefined,
            contact_info: { linkedin_public_id: publicId || undefined },
            message: phoneInContent
                ? 'Phone found in post content.'
                : 'Email found in post content.',
        });
        lead = result.data;
        lastMessage = result.message;
        if (hasVerifiedEmail(lead) && leadHasPhone(lead)) {
            return result;
        }
    }

    // Threads path
    if (lead.platform === 'threads') {
        const contact = await findThreadsContact(lead);
        if (!contact) {
            if (enrichmentComplete(lead)) {
                await lead.save();
                return { success: true, data: lead, message: lastMessage };
            }
            throw new ErrorResponse('Could not find contact details for this Threads profile', 404);
        }

        return applyContactUpdate(lead, {
            email: contact.email,
            phone: contact.phone,
            phone_source: contact.phone ? 'threads_profile' : undefined,
            email_status: contact.email ? 'unverified' : undefined,
            email_source: contact.email ? 'threads_profile' : undefined,
            contact_info: {
                name: contact.profile_info?.name,
                headline: contact.profile_info?.bio,
                linkedin_public_id: contact.profile_info?.username,
            },
            message: contact.phone
                ? 'Phone found via Threads profile.'
                : contact.email
                    ? 'Email found via Threads profile (review recommended).'
                    : 'Profile found but no contact on Threads.',
        });
    }

    let profileData = null;
    const linkedinUrl = authorUrl?.includes('linkedin.com/in/') ? authorUrl : null;

    // Step 2 — Apify LinkedIn profile + website
    if (linkedinUrl) {
        profileData = await scrapeLinkedInAuthorProfile(linkedinUrl);
        publicId = resolveLinkedInPublicIdFromLead(lead, profileData?.linkedin_public_id) || publicId;

        if (profileData?.email || profileData?.phone) {
            const result = await applyContactUpdate(lead, {
                email: profileData.email,
                phone: profileData.phone,
                phone_source: profileData.phone ? 'apify_profile' : undefined,
                email_source: profileData.email ? 'apify_profile' : undefined,
                contact_info: {
                    name: profileData.name,
                    first_name: profileData.first_name,
                    last_name: profileData.last_name,
                    headline: profileData.headline,
                    company_name: profileData.company_name,
                    linkedin_public_id: publicId || undefined,
                    company_domain: profileData.company_domain,
                },
                message: profileData.phone
                    ? 'Phone found on LinkedIn profile via Apify.'
                    : 'Email found on LinkedIn profile via Apify.',
            });
            lead = result.data;
            lastMessage = result.message;
            if (hasVerifiedEmail(lead) && leadHasPhone(lead)) {
                return result;
            }
        } else if (profileData) {
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
            await lead.save();
        }
    }

    // Steps 3–4 — ContactOut + Apollo (phone-first paid lookups)
    if (linkedinUrl && !leadHasPhone(lead)) {
        const paid = await tryPaidPhoneLookup(linkedinUrl, paidLookupsUsed);
        if (paid.phone || paid.email) {
            const result = await applyContactUpdate(lead, {
                email: !lead.email ? paid.email : undefined,
                phone: paid.phone,
                phone_source: paid.source || undefined,
                email_source: paid.email ? (paid.source as EmailSource) : undefined,
                email_status: paid.email ? 'unverified' : undefined,
                contact_info: {
                    ...paid.contactInfo,
                    linkedin_public_id: publicId || paid.contactInfo.linkedin_public_id,
                },
                message: paid.phone
                    ? `Phone found via ${paid.source === 'contactout' ? 'ContactOut' : 'Apollo'}.`
                    : `Email found via ${paid.source === 'contactout' ? 'ContactOut' : 'Apollo'}.`,
            });
            lead = result.data;
            lastMessage = result.message;
        }
    }

    // Steps 5–6 — Contact Compass + Hunter.io (email; phones from Compass payload)
    if (!hasVerifiedEmail(lead) && (publicId || profileData || lead.contact_info?.company_domain)) {
        try {
            const candidates = await collectDualFindCandidates({ publicId, profileData, lead });
            if (candidates.length > 0) {
                const primaryCandidate = candidates[0];
                const compassPhone = pickFirstPhone(
                    ...(primaryCandidate.contactInfo?.phone_numbers || []).map((p: any) => p?.number)
                );

                const result = await tryDualFindCandidates(lead, candidates);
                lead = result.data;

                if (!leadHasPhone(lead) && compassPhone) {
                    const phoneResult = await applyContactUpdate(lead, {
                        phone: compassPhone,
                        phone_source: 'contact_compass',
                        message: 'Phone found via Contact Compass.',
                    });
                    lead = phoneResult.data;
                }

                if (result?.success) {
                    return {
                        ...result,
                        message: leadHasPhone(lead) && result.message
                            ? `${result.message} Phone included.`
                            : result.message,
                    };
                }
                lastMessage = result.message || lastMessage;
            }
        } catch (error) {
            if (error instanceof ErrorResponse) throw error;
            console.error('[Enrichment] Dual find failed:', error);
        }
    }

    // Step 7 — pattern guess (email last resort)
    if (!hasVerifiedEmail(lead)) {
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
    }

    if (enrichmentComplete(lead)) {
        await lead.save();
        return {
            success: true,
            data: lead,
            message: leadHasPhone(lead)
                ? `${lastMessage} Phone on file.`
                : lastMessage,
        };
    }

    if (profileData || publicId) {
        await lead.save();
        return {
            success: false,
            data: lead,
            message: publicId
                ? 'Profile enriched but no contact found across all sources.'
                : 'Could not extract LinkedIn profile ID for contact lookup.',
        };
    }

    throw new ErrorResponse('Could not extract LinkedIn public ID from author profile URL', 400);
};
