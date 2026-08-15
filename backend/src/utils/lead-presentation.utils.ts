import { sanitizeContactFields } from './contact-redaction.utils';

export const LOCKED_INTELLIGENCE_TEASER =
    'Strategic intelligence report ready. Claim this lead to unlock the full analysis.';

export const LOCKED_CONTENT_TEASER =
    'Original signal locked. This high-relevance lead has been verified by the Intelligence Engine. Claim this lead to unlock the full original post and contact data.';

// Regex patterns for contact info redaction
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?\d[\d\s\-()\/.]{6,}\d)/g;

/**
 * Redact emails and phone numbers from text for unclaimed users.
 */
function redactContactsFromText(text: string): string {
    if (!text) return text;
    return text
        .replace(EMAIL_REGEX, '[email hidden]')
        .replace(PHONE_REGEX, '[phone hidden]');
}

/**
 * Redact lead fields for external users until they claim (or are platform-internal).
 */
export function presentLeadForUser(
    post: any,
    options: { isInternal: boolean; isClaimed: boolean }
) {
    const { isInternal, isClaimed } = options;
    const shouldShowSensitive = isClaimed || isInternal;
    const contact = sanitizeContactFields(post, { isInternal, isClaimed });
    const hasIntelligence = Boolean(post.intelligence);

    // For unclaimed external users — redact emails/phones from content
    // even if content is partially visible, no contact info leaks through
    const safeContent = shouldShowSensitive
        ? post.content
        : LOCKED_CONTENT_TEASER;

    const redactedPost: any = {
        ...post,
        is_claimed: isClaimed,
        has_intelligence: hasIntelligence,
        content: safeContent,
        email: contact.email,
        contact_info: contact.contact_info,
        author: shouldShowSensitive
            ? post.author
            : {
                  name: `Strategic Lead [${String(post.platform || 'social').toUpperCase()}]`,
                  handle: 'locked',
                  url: '#',
                  avatar: { url: '' },
              },
        url: shouldShowSensitive ? post.url : '#',
        intelligence: shouldShowSensitive
            ? post.intelligence
            : hasIntelligence
              ? LOCKED_INTELLIGENCE_TEASER
              : post.intelligence ?? null,
    };

    if (!shouldShowSensitive) {
        delete redactedPost.raw_result;
        if (redactedPost.source_profile) redactedPost.source_profile = 'locked';
    }

    return redactedPost;
}

/**
 * Redact contact info from content — used when content must be shown
 * but contact details should still be hidden (e.g. preview mode).
 */
export function redactContactsInContent(content: string): string {
    return redactContactsFromText(content);
}
