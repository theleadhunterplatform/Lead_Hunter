import { sanitizeContactFields } from './contact-redaction.utils';

export const LOCKED_INTELLIGENCE_TEASER =
    'Strategic intelligence report ready. Claim this lead to unlock the full analysis.';

export const LOCKED_CONTENT_TEASER =
    'Original signal locked. This high-relevance lead has been verified by the Intelligence Engine. Claim this lead to unlock the full original post and contact data.';

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

    const redactedPost: any = {
        ...post,
        is_claimed: isClaimed,
        has_intelligence: hasIntelligence,
        content: shouldShowSensitive ? post.content : LOCKED_CONTENT_TEASER,
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
