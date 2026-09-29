import { AppLead } from '@/types/lead'
import { parseIntelSections, sanitizePublicText } from '@/lib/claim-reveal'

/**
 * Build the canonical "Copy lead intel" text.
 *
 * This is a direct port of the LeadDrawer's buildIntelText so every surface
 * that copies lead intel (lead feed drawer Deep Intel + saved leads action
 * menu) produces byte-identical output from the same data:
 *
 * - display title (FOR <company> substitution)
 * - Summary (detailsSummary → summary → taskScope fallback)
 * - every parsed AI intel section from the buyerType blob (Verdict, Context,
 *   Requirements, etc. — falls back to Buyer/Scope/Requirements/Bonus)
 * - Tags, reply probability, Contact line, "via Lead Hunter Club · timestamp"
 *
 * Locked (unrevealed) leads get the safe preview without contact details.
 */
export function buildLeadIntelText(lead: AppLead): string {
  const parsedIntel = parseIntelSections(lead.buyerType || '')

  const displayTitle = !lead.isRevealed
    ? lead.title || 'OPPORTUNITY FOR —'
    : lead.title && lead.title !== '--' && lead.title !== '-'
      ? lead.title.replace(/FOR —|FOR -/i, `FOR ${lead.company || lead.name}`)
      : lead.company || lead.name || 'Lead Signal'

  const taskScopeDisplay = lead.isRevealed
    ? lead.taskScope
    : sanitizePublicText(lead.taskScope || '')

  const detailsSummaryDisplay =
    lead.detailsSummary && lead.detailsSummary.trim() !== ''
      ? lead.isRevealed
        ? lead.detailsSummary
        : sanitizePublicText(lead.detailsSummary)
      : lead.summary && lead.summary.trim() !== ''
        ? lead.isRevealed
          ? lead.summary
          : sanitizePublicText(lead.summary)
        : taskScopeDisplay

  if (!lead.isRevealed) {
    const lines = [
      `${displayTitle}`,
      detailsSummaryDisplay ? `Summary: ${detailsSummaryDisplay}` : '',
      `Tags: ${(lead.nicheTags || []).join(', ') || '—'}`,
      lead.replyProbability > 0 ? `Reply probability: ${lead.replyProbability}%` : '',
      'Strategic Intel & Contact: Locked — unlock lead to reveal full strategic brief & verified contact info',
      `via Lead Hunter Club${lead.timestamp ? ` · ${lead.timestamp}` : ''}`,
    ]
    return lines.filter(Boolean).join('\n')
  }

  const sectionLines: string[] =
    parsedIntel.length > 0
      ? parsedIntel.map((s) => `${s.label}: ${s.body}`)
      : [
          `Buyer: ${lead.buyerType || lead.role || '—'}`,
          `Scope: ${lead.taskScope || lead.category || '—'}`,
          `Requirements: ${lead.mustHave || '—'}`,
          lead.nicheBonus ? `Bonus: ${lead.nicheBonus}` : '',
        ].filter(Boolean)

  const lines = [
    `${displayTitle}`,
    detailsSummaryDisplay ? `Summary: ${detailsSummaryDisplay}` : '',
    ...sectionLines,
    `Tags: ${(lead.nicheTags || []).join(', ') || '—'}`,
    lead.replyProbability > 0 ? `Reply probability: ${lead.replyProbability}%` : '',
    `Contact: ${lead.name}${lead.email ? ` <${lead.email}>` : ''}${lead.phone ? ` · ${lead.phone}` : ''}`,
    `via Lead Hunter Club${lead.timestamp ? ` · ${lead.timestamp}` : ''}`,
  ]
  return lines.filter(Boolean).join('\n')
}
