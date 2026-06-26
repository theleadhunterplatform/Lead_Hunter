export const MANUAL_LABEL_HINTS = [
    'Manually marked',
    'Rejected during admin review',
    'Rejected during bulk admin review',
];

export function isManuallyLabeled(qualificationReason?: string | null): boolean {
    if (!qualificationReason) return false;
    return MANUAL_LABEL_HINTS.some((hint) => qualificationReason.includes(hint));
}
