import { describe, it, expect } from 'vitest'
import { leadsToRows, toCsv, toTsv } from '@/lib/csv'
import type { AppLead } from '@/types/lead'

function makeLead(overrides: Partial<AppLead> = {}): AppLead {
  return {
    id: 'l1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    company: 'Analytical Engines Ltd',
    source: 'Reddit',
    category: 'SaaS',
    title: 'Need a cold email operator FOR —',
    signalContext: 'Hiring post: scaling outbound this quarter',
    role: 'Senior outreach operator',
    taskScope: 'Build and run cold email infrastructure',
    mustHave: 'Proven B2B SaaS deliverability',
    nicheBonus: 'Experience with HR-tech buyers',
    buyerType: '',
    urgency: 'high',
    winProb: 'medium',
    nicheTags: ['SaaS', 'Cold Email'],
    hashtags: [],
    replyProbability: 72,
    status: 'saved',
    timestamp: '2 days ago',
    niches: ['SaaS'],
    isSaved: true,
    isRevealed: true,
    phone: '+15551234567',
    summary: 'Short summary',
    detailsSummary: 'Detailed summary from the API',
    ...overrides,
  }
}

const FULL_INTEL = [
  '## Verdict',
  'Strong fit — they need an operator who can own outbound end to end, from targeted list building all the way to booked meetings, without pulling the founder back into prospecting every week.',
  '## Context',
  'Team of 12, moving from founder-led sales to a dedicated outbound motion before the next funding round, with a fresh SDR hire starting next month and no documented process yet.',
  '## Requirements',
  'Warmup, domain rotation, a documented sequence library, and weekly reporting on reply and meeting rates so the board can track pipeline contribution.',
].join('\n')

describe('leadsToRows', () => {
  it('exports the full parsed Deep Intel sections from the API, not a truncated mash', () => {
    const [row] = leadsToRows([makeLead({ buyerType: FULL_INTEL })])

    expect(row['Lead Intelligence']).toContain('Verdict: Strong fit')
    expect(row['Lead Intelligence']).toContain('Context: Team of 12')
    expect(row['Lead Intelligence']).toContain('Requirements: Warmup')
    // Old exporter cut the intel at 400 chars — full sections must survive.
    expect((row['Lead Intelligence'] as string).length).toBeGreaterThan(400)
  })

  it('exports the structured fields alongside the intel', () => {
    const [row] = leadsToRows([makeLead({ buyerType: FULL_INTEL })])

    expect(row.Name).toBe('Ada Lovelace')
    expect(row.Email).toBe('ada@example.com')
    expect(row.Phone).toBe('+15551234567')
    expect(row.Company).toBe('Analytical Engines Ltd')
    expect(row.Summary).toBe('Detailed summary from the API')
    expect(row['Signal Context']).toBe('Hiring post: scaling outbound this quarter')
    expect(row['Reply Probability']).toBe('72%')
    expect(row.Tags).toBe('SaaS, Cold Email')
    expect(row.Status).toBe('saved')
    expect(row.Urgency).toBe('high')
  })

  it('keeps contact columns gated until the lead is revealed', () => {
    const [row] = leadsToRows([makeLead({ isRevealed: false, buyerType: FULL_INTEL })])

    expect(row.Name).toBe('')
    expect(row.Email).toBe('')
    expect(row.Phone).toBe('')
    // Intel/summary still export — API serves its sanitized public preview.
    expect(row['Lead Intelligence']).toContain('Verdict:')
    expect(row.Summary).toBe('Detailed summary from the API')
  })

  it('falls back to the classic labelled pieces when the blob has no headings', () => {
    const [row] = leadsToRows([
      makeLead({ buyerType: 'a plain unsectioned intel blob' }),
    ])

    expect(row['Lead Intelligence']).toContain('One-Liner: Senior outreach operator')
    expect(row['Lead Intelligence']).toContain('What They Actually Want: Proven B2B SaaS deliverability')
    expect(row['Lead Intelligence']).toContain('How to Win: Experience with HR-tech buyers')
  })

  it('caps runaway cells at CELL_CAP with an ellipsis', () => {
    const [row] = leadsToRows([makeLead({ signalContext: 'x'.repeat(20_000) })])

    expect((row['Signal Context'] as string).length).toBeLessThanOrEqual(5001)
    expect((row['Signal Context'] as string).endsWith('…')).toBe(true)
  })

  it('produces parseable CSV/TSV with the intel intact', () => {
    const rows = leadsToRows([makeLead({ buyerType: FULL_INTEL })])

    const csv = toCsv(rows)
    expect(csv.split('\r\n')).toHaveLength(2)
    expect(csv).toContain('Lead Intelligence')
    expect(csv).toContain('Verdict: Strong fit')

    const tsv = toTsv(rows)
    expect(tsv.split('\n')).toHaveLength(2)
    expect(tsv).toContain('Detailed summary from the API')
  })
})
