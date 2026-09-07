'use client'

import { useCallback } from 'react'
import { dashboardService } from '@/lib/services'
import { useApi } from './useApi'
import type { DashboardData } from '@/lib/types'

export function useDashboard() {
  const fetcher = useCallback(() => dashboardService.getData(), [])
  return useApi<DashboardData>(fetcher)
}
