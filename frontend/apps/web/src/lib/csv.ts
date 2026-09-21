import ExcelJS from 'exceljs'
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

const HEADER_FILL = '0F172A'
const WIDE_COLS = new Set(['Lead Intelligence'])
export async function downloadXlsx(
  filename: string,
  rows: Record<string, string | number | null | undefined>[],
  metadata?: string,
) {
  if (rows.length === 0) return

  const headers = Object.keys(rows[0] ?? {})
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
