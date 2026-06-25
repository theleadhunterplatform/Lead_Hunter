import axios from 'axios';
import LeadPost from '../models/lead-post.model';
import { getSetting } from './setting.service';
import ErrorResponse from '../utils/error-response.utils';
import { recordContactCompassLookup } from '../utils/contact-compass-usage.utils';
import { findPhonesWithContactOut } from '../utils/contactout-api.utils';
import { findPhonesWithApollo } from '../utils/apollo-api.utils';
import { runFreePhoneDiscovery } from '../utils/phone-discovery.utils';
import {
    enrichSocialProfileForLead,
    ENRICHABLE_PLATFORMS,
    getProfileContactSources,
    type SocialProfileData,
} from './social-profile-enrichment.service';
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
    | 'twitter_profile'
    | 'reddit_profile'
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

async function tryHunterEmailDiscovery(lead: any, profileData?: SocialProfileData | null) {
    const personName = parsePersonName(
        profileData?.name || lead.contact_info?.name || lead.author?.name
    );
    const domain = profileData?.company_domain || lead.contact_info?.company_domain;
    const company = profileData?.company_name || lead.contact_info?.company_name;

    const hunterFound = await findEmailWithHunterMulti({
        domain: domain || undefined,
        company: !domain ? company || undefined : undefined,
        firstName: personName?.first,
        lastName: personName?.last,
        fullName: personName ? undefined : profileData?.name || lead.contact_info?.name,
    });

    if (!hunterFound?.email) return { lead, applied: false, message: null };

    const result = await applyContactUpdate(lead, {
        email: hunterFound.email,
        email_source: 'hunter_finder',
        hunter_finder_status: hunterFound.verificationStatus,
        contact_info: {
            company_name: hunterFound.company || company,
            title: hunterFound.position,
            company_domain: domain,
        },
        message: `Email found via Hunter.io (score ${hunterFound.score}).`,
    });

    return { lead: result.data, applied: true, message: result.message };
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

async function tryApplyPhoneHit(
    lead: any,
    phone: string | null | undefined,
    phone_source: PhoneSource | undefined,
    message: string
) {
    if (!phone || leadHasPhone(lead)) return { lead, message, applied: false };

    const result = await applyContactUpdate(lead, {
        phone,
        phone_source,
        message,
    });

    return { lead: result.data, message: result.message, applied: true };
}

async function tryFreePhoneDiscovery(lead: any, profileData?: any) {
    const hit = await runFreePhoneDiscovery({
        content: lead.content,
        author: lead.author,
        profileData,
        contactInfo: lead.contact_info,
    });

    if (!hit) return { lead, lastMessage: null, applied: false };

    const applied = await tryApplyPhoneHit(lead, hit.phone, hit.source, hit.message);
    return {
        lead: applied.lead,
        lastMessage: applied.message,
        applied: applied.applied,
    };
}

async function tryLookupCompassPhone(publicId: string): Promise<string | null> {
    try {
        const person = await lookupContactCompass(publicId);
        if (!person?.phone_numbers?.length) return null;
        return pickFirstPhone(...person.phone_numbers.map((p: any) => p?.number));
    } catch (error: any) {
        if (error instanceof ErrorResponse) throw error;
        console.warn('[Enrichment] Compass phone lookup failed:', error?.message || error);
        return null;
    }
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

    if (!ENRICHABLE_PLATFORMS.includes(lead.platform)) {
        throw new ErrorResponse(
            'Contact finding only supported for LinkedIn, Threads, X (Twitter), and Reddit leads',
            400
        );
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

    if (!leadHasPhone(lead)) {
        const authorPhone = extractPhoneFromText(
            [lead.author?.info, lead.author?.website].filter(Boolean).join(' ')
        );
        const authorApplied = await tryApplyPhoneHit(
            lead,
            authorPhone,
            'author_info',
            'Phone found in author profile info.'
        );
        if (authorApplied.applied) {
            lead = authorApplied.lead;
            lastMessage = authorApplied.message || lastMessage;
            if (hasVerifiedEmail(lead) && leadHasPhone(lead)) {
                return { success: true, data: lead, message: lastMessage };
            }
        }
    }

    let profileData: SocialProfileData | null = null;
    const linkedinUrl =
        lead.platform === 'linkedin' && authorUrl?.includes('linkedin.com/in/') ? authorUrl : null;
    const profileSources = getProfileContactSources(lead.platform);

    // Step 2 — platform profile (LinkedIn / Threads / X / Reddit)
    profileData = await enrichSocialProfileForLead(lead);
    if (lead.platform === 'linkedin' && profileData) {
        publicId = resolveLinkedInPublicIdFromLead(lead, profileData?.linkedin_public_id) || publicId;
    }

    if (profileData?.email || profileData?.phone) {
        const result = await applyContactUpdate(lead, {
            email: profileData.email,
            phone: profileData.phone,
            phone_source: profileData.phone ? profileSources.phone : undefined,
            email_source: profileData.email ? profileSources.email : undefined,
            contact_info: {
                name: profileData.name,
                first_name: profileData.first_name,
                last_name: profileData.last_name,
                headline: profileData.headline,
                company_name: profileData.company_name,
                linkedin_public_id: publicId || profileData.linkedin_public_id || undefined,
                company_domain: profileData.company_domain,
                city: profileData.city,
                state: profileData.state,
                country: profileData.country,
            },
            message: profileData.phone
                ? `Phone found on ${lead.platform} profile.`
                : `Email found on ${lead.platform} profile.`,
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
            city: profileData.city || lead.contact_info?.city,
            state: profileData.state || lead.contact_info?.state,
            country: profileData.country || lead.contact_info?.country,
        };
        await lead.save();
    }

    // Step 2b — website + Google Maps (free sources, uses profile/company context)
    if (!leadHasPhone(lead)) {
        const freeDiscovery = await tryFreePhoneDiscovery(lead, profileData);
        if (freeDiscovery.applied) {
            lead = freeDiscovery.lead;
            lastMessage = freeDiscovery.lastMessage || lastMessage;
            if (hasVerifiedEmail(lead) && leadHasPhone(lead)) {
                return { success: true, data: lead, message: lastMessage };
            }
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

    // Step 5 — Contact Compass phone lookup when email exists but phone does not
    if (!leadHasPhone(lead) && hasVerifiedEmail(lead) && publicId) {
        const compassPhone = await tryLookupCompassPhone(publicId);
        if (compassPhone) {
            const phoneResult = await tryApplyPhoneHit(
                lead,
                compassPhone,
                'contact_compass',
                'Phone found via Contact Compass.'
            );
            if (phoneResult.applied) {
                lead = phoneResult.lead;
                lastMessage = phoneResult.message || lastMessage;
            }
        }
    }

    // Step 6 — Contact Compass + Hunter.io (LinkedIn) or Hunter-only (other platforms)
    if (!hasVerifiedEmail(lead) && (publicId || profileData || lead.contact_info?.company_domain)) {
        try {
            if (publicId && lead.platform === 'linkedin') {
                const candidates = await collectDualFindCandidates({ publicId, profileData, lead });
                if (candidates.length > 0) {
                    const primaryCandidate = candidates[0];
                    const compassPhone = pickFirstPhone(
                        ...(primaryCandidate.contactInfo?.phone_numbers || []).map((p: any) => p?.number)
                    );

                    const result = await tryDualFindCandidates(lead, candidates);
                    lead = result.data;

                    if (!leadHasPhone(lead) && compassPhone) {
                        const phoneResult = await tryApplyPhoneHit(
                            lead,
                            compassPhone,
                            'contact_compass',
                            'Phone found via Contact Compass.'
                        );
                        lead = phoneResult.lead;
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
            } else {
                const hunterResult = await tryHunterEmailDiscovery(lead, profileData);
                if (hunterResult.applied) {
                    lead = hunterResult.lead;
                    lastMessage = hunterResult.message || lastMessage;
                    if (hasVerifiedEmail(lead) && leadHasPhone(lead)) {
                        return { success: true, data: lead, message: lastMessage };
                    }
                }
            }
        } catch (error) {
            if (error instanceof ErrorResponse) throw error;
            console.error('[Enrichment] Email discovery failed:', error);
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

    if (profileData || publicId || lead.platform !== 'linkedin') {
        await lead.save();
        return {
            success: false,
            data: lead,
            message: enrichmentComplete(lead)
                ? lastMessage
                : 'Profile enriched but no contact found across all sources.',
        };
    }

    throw new ErrorResponse('Could not enrich author profile for contact lookup', 400);
};
