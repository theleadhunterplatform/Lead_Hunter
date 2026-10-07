import type { AppLead } from '@/types/lead'
import { parseIntelSections } from '@/lib/claim-reveal'

// Spreadsheet cells hold 32,767 chars; cap well below that so a single
// runaway intel blob can't break Excel while keeping full intel intact.
const CELL_CAP = 5000

function cell(value: string | null | undefined, max: number = CELL_CAP): string {
  const clean = (value ?? '').replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max).trim()}…`
}

/**
 * Full "Lead Intelligence" cell — the same intel the API hands the UI:
 * every parsed Deep Intel section (Verdict, Context, Requirements, …)
 * exactly as the drawer shows them. Falls back to the classic labelled
 * pieces when the blob has no parseable headings, then to the raw blob.
 */
function intelText(l: AppLead): string {
  const sections = parseIntelSections(l.buyerType || '')
  if (sections.length > 0) {
    return sections.map((s) => `${cell(s.label, 120)}: ${cell(s.body)}`).join(' • ')
  }

  const parts: string[] = []
  const push = (label: string, value: string) => {
    const v = cell(value)
    if (v) parts.push(`${label}: ${v}`)
  }
  push('One-Liner', l.role)
  push('Context You Might Miss', l.taskScope)
  push('What They Actually Want', l.mustHave)
  push('How to Win', l.nicheBonus)
  if (parts.length > 0) return parts.join(' • ')

  return cell(l.buyerType)
}

/**
 * One spreadsheet row per lead. Contact columns stay reveal-gated
 * (blank until the lead is unlocked); intel/summary/signal columns carry
 * whatever the API returned — for unrevealed leads that is the server's
 * sanitized public preview, same as every UI surface shows.
 */
export function leadsToRows(leads: AppLead[]) {
  return leads.map((l) => ({
    Name: l.isRevealed ? cell(l.name, 200) : '',
    Email: l.isRevealed ? cell(l.email, 320) : '',
    Phone: l.isRevealed && l.phone ? cell(l.phone, 64) : '',
    Company: cell(l.company),
    Title: cell(l.title),
    'One-Liner': cell(l.role),
    Category: cell(l.category),
    Source: cell(l.source),
    Status: l.status ?? '',
    Urgency: l.urgency ?? '',
    'Reply Probability': l.replyProbability > 0 ? `${l.replyProbability}%` : '',
    Summary: cell(l.detailsSummary || l.summary || l.taskScope),
    'Signal Context': cell(l.signalContext),
    'Lead Intelligence': intelText(l),
    Tags: cell((l.nicheTags || []).join(', ')),
  }))
}

export function toCsv(rows: Record<string, string | number | null | undefined>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (value: string | number | null | undefined) => {
    const str = value === null || value === undefined ? '' : String(value)
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  const lines = [headers.map(escape).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','))
  }
  return lines.join('\r\n')
}

export function toTsv(rows: Record<string, string | number | null | undefined>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (value: string | number | null | undefined) => {
    const str = value === null || value === undefined ? '' : String(value)
    if (/[\t\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  const lines = [headers.map(escape).join('\t')]
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join('\t'))
  }
  return lines.join('\r\n')
}

const HEADER_FILL = '0F172A'
const WIDE_COLS = new Set(['Lead Intelligence', 'Summary', 'Signal Context'])
export async function downloadXlsx(
  filename: string,
  rows: Record<string, string | number | null | undefined>[],
  metadata?: string,
) {
  if (rows.length === 0) return

  const headers = Object.keys(rows[0] ?? {})
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  workbook.creator = metadata || 'LeadHunter'
  const sheet = workbook.addWorksheet('Leads')

  sheet.columns = headers.map((h) => ({
    header: h,
    key: h,
    width: Math.min(
      Math.max(
        WIDE_COLS.has(h) ? 55 : 18,
        ...rows.map((r) => String(r[h] ?? '').length + 2),
      ),
      75,
    ),
  }))

  for (const row of rows) {
    const out: Record<string, string | number> = {}
    for (const h of headers) {
      const v = row[h]
      out[h] = v === null || v === undefined ? '' : (v as string | number)
    }
    sheet.addRow(out)
  }

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
  headerRow.height = 20

  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: headers.length } }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
