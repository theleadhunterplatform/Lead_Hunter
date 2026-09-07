export type LeadStatus = 'new' | 'saved' | 'drafting' | 'sent' | 'replied' | 'follow-up'

export type LeadUrgency = 'low' | 'medium' | 'high' | 'critical'

export type LeadAccent = 'mint' | 'purple' | 'cyan' | 'orange' | 'pink'

export type LeadSource =
  | 'Twitter'
  | 'LinkedIn'
  | 'Reddit'
  | 'Indie Hackers'
  | 'Job Board'
  | 'Threads'

export interface Lead {
  id: string
  name: string
  email: string
  company: string
  source: LeadSource | string
  title: string
  signalContext: string
  urgency: LeadUrgency
  nicheTags: string[]
  replyProbability: number
  accent: LeadAccent
  status: LeadStatus
  timestamp: string
  lastActionDate?: string
  isActionable?: boolean
}

export interface LeadIntentScore {
  score: number
  confidence: 'low' | 'medium' | 'high'
  factors: string[]
}

export interface LeadIntelligence {
  leadId: string
  decisionMaker: string
  role: string
  funding: string
  companySize: string
  intentScore: LeadIntentScore
  strategicPaths: StrategicPath[]
  socialLinks: SocialLink[]
  aiNote: string
}

export interface StrategicPath {
  id: string
  name: string
  description: string
  tone: string
  accent: LeadAccent
}

export interface SocialLink {
  platform: string
  url: string
  label: string
}

export interface CreateLeadInput {
  name: string
  email: string
  company: string
  source: string
  title: string
  signalContext: string
  urgency: LeadUrgency
  nicheTags: string[]
}

export interface UpdateLeadInput {
  status?: LeadStatus
  isActionable?: boolean
  signalContext?: string
}
