import { api } from '@/lib/api'
import type { DashboardData } from '@/lib/types'

export const dashboardService = {
  getData: () => api.get<DashboardData>('/dashboard'),
}
