import { google } from 'googleapis'

const rawKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY || ''
const privateKey = rawKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '').trim()

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    private_key: privateKey,
  },
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
  ],
})

const sheets = google.sheets({ version: 'v4', auth })

export interface SheetLeadRow {
  name: string
  email: string
  phone: string
  company: string
  signalContext: string
  aiDraft?: string
  status: string
  urgency: string
  replyProbability: number
  followUpDate?: string
}

const HEADERS = [
  'Name',
  'Email',
  'Phone',
  'Company',
  'Buying Signal',
  'AI Draft',
  'Status',
  'Urgency',
  'Reply %',
  'Follow-up Date',
]

export async function createLeadSheet(leads: SheetLeadRow[]): Promise<string> {
  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: `Lead Hunter Club - ${new Date().toLocaleDateString()}` },
      sheets: [{ properties: { title: 'Leads' } }],
    },
  })

  const sheetId = response.data.spreadsheetId!
  const rows = leads.map((l) => [
    l.name,
    l.email,
    l.phone,
    l.company,
    l.signalContext,
    l.aiDraft || '',
    l.status,
    l.urgency,
    l.replyProbability,
    l.followUpDate || '',
  ])

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: 'Leads!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS, ...rows] },
  })

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [
        {
          setDataValidation: {
            range: {
              sheetId: 0,
              startRowIndex: 1,
              startColumnIndex: 6,
              endColumnIndex: 7,
            },
            rule: {
              condition: {
                type: 'ONE_OF_LIST',
                values: [
                  { userEnteredValue: 'Saved' },
                  { userEnteredValue: 'Sent' },
                  { userEnteredValue: 'Replied' },
                  { userEnteredValue: 'Follow-up' },
                ],
              },
              showCustomUi: true,
            },
          },
        },
      ],
    },
  })

  return `https://docs.google.com/spreadsheets/d/${sheetId}`
}

export async function appendToSheet(sheetId: string, leads: SheetLeadRow[]) {
  const rows = leads.map((l) => [
    l.name,
    l.email,
    l.phone,
    l.company,
    l.signalContext,
    l.aiDraft || '',
    l.status,
    l.urgency,
    l.replyProbability,
    l.followUpDate || '',
  ])
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'Leads!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  })
}

export async function syncFromSheet(sheetId: string): Promise<{ email: string; status: string }[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Leads!A:J',
  })
  const rows = response.data.values || []
  return rows.slice(1).map((row) => ({
    email: row[1] || '',
    status: row[6] || 'Saved',
  }))
}
