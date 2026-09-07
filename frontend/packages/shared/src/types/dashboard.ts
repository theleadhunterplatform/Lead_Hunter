import type { LeadAccent } from './lead'

export interface DashboardStat {
  label: string
  value: string
  trend?: string
  trendUp?: boolean
  accent: LeadAccent
}

export interface ActivityDataPoint {
  day: string
  value: number
}

export interface LeadDistributionItem {
  label: string
  trend: string
  color: LeadAccent
}

export interface DashboardData {
  stats: DashboardStat[]
  activity: ActivityDataPoint[]
  distribution: LeadDistributionItem[]
  readyForOutreachCount: number
}

export interface DashboardSummary {
  totalLeads: number
  activeConversations: number
  averageReplyProbability: number
  creditsRemaining: number
  creditsTotal: number
}
