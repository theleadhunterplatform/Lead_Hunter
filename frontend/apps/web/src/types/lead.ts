export type LeadStatus = 'new' | 'saved' | 'drafting' | 'sent' | 'replied' | 'follow-up'

export interface AppLead {
  id: string
  name: string
  email: string
  company: string
  source: string
  category: string
  title: string
  signalContext: string
  role: string
  taskScope: string
  mustHave: string
  nicheBonus: string
  buyerType: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  winProb: 'low' | 'medium' | 'high'
  nicheTags: string[]
  hashtags: string[]
  replyProbability: number
  status: LeadStatus
  timestamp: string
  lastActionDate?: string
  isActionable?: boolean
  niches: string[]
  isSaved?: boolean
  isRevealed?: boolean
  isClaimable?: boolean
  hasPhone?: boolean
  revealCost?: number | null
  phone?: string | null
  accent?: 'mint' | 'purple' | 'cyan' | 'orange' | 'pink' | string
}
