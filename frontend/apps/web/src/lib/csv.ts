import * as XLSX from 'xlsx'
import type { AppLead } from '@/types/lead'

const TRUNCATE_LENGTH = 200

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max).trim()}…`
}

function formatIntel(l: AppLead): string {
  const parts: string[] = []
  const push = (label: string, value: string) => {
    const clean = value.replace(/\s+/g, ' ').trim()
    if (clean) parts.push(`${label}: ${clean}`)
  }
  push('One-Liner', l.role)
  push('Context You Might Miss', l.taskScope)
  push('What They Actually Want', l.mustHave)
  push('How to Win', l.nicheBonus)
  if (l.buyerType && l.buyerType.replace(/\s+/g, ' ').trim()) {
    push('Full Intel', l.buyerType)
  }
  return truncate(parts.join(' • '), 400)
}

export function leadsToRows(leads: AppLead[]) {
  return leads.map((l) => ({
    Name: l.isRevealed ? l.name : '',
    Email: l.isRevealed ? l.email : '',
    Phone: l.isRevealed && l.phone ? l.phone : '',
    Company: l.company,
    'Lead Intelligence': formatIntel(l),
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

const HEADER_FILL = { fgColor: { rgb: '0F172A' } }
const HEADER_FONT = { bold: true, color: { rgb: 'FFFFFF' } }
const WIDE_COLS = new Set(['Lead Intelligence'])
export function downloadXlsx(
  filename: string,
  rows: Record<string, string | number | null | undefined>[],
  metadata?: string,
) {
  if (rows.length === 0) return

  const headers = Object.keys(rows[0] ?? {})
  const aoa: (string | number)[][] = [headers]
  for (const row of rows) {
    aoa.push(headers.map((h) => (row[h] === null || row[h] === undefined ? '' : row[h]) as string | number))
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = headers.map((h) => ({
    wch: Math.min(
      Math.max(
        WIDE_COLS.has(h) ? 55 : 18,
        ...aoa.slice(1).map((r) => String(r[headers.indexOf(h)] ?? '').length + 2),
      ),
      75,
    ),
  }))
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: headers.length - 1 } }) }
  ws['!freeze'] = { x: 0, y: 1 }

  for (let c = 0; c < headers.length; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })]
    if (cell) {
      cell.s = { fill: HEADER_FILL, font: HEADER_FONT }
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Leads')
  if (metadata) {
    wb.Props = wb.Props || {}
    wb.Props.Title = metadata
  }
  XLSX.writeFile(wb, filename)
}
