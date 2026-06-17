import { isVerifiedEmailStatus } from './lead-enrichment.utils';

export function sanitizeContactFields(
    post: any,
    options: { isInternal: boolean; isClaimed: boolean }
) {
    const { isInternal, isClaimed } = options;
    const canViewContact = isInternal || isClaimed;
    const emailIsVerified = post.email && isVerifiedEmailStatus(post.contact_info?.email_status);

    if (!canViewContact) {
        return {
            email: null,
            contact_info: null,
        };
    }

    if (!isInternal && !emailIsVerified) {
        return {
            email: null,
            contact_info: post.contact_info
                ? {
                    ...post.contact_info,
                    email_status: post.contact_info.email_status,
                    email_source: post.contact_info.email_source,
                    name: post.contact_info.name,
                    title: post.contact_info.title,
                    headline: post.contact_info.headline,
                    company_name: post.contact_info.company_name,
                    linkedin_public_id: post.contact_info.linkedin_public_id,
                    phone_numbers: post.contact_info.phone_numbers,
                }
                : null,
        };
    }

    return {
        email: post.email,
        contact_info: post.contact_info,
    };
}
