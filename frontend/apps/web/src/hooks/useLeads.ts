'use client'

import { useCallback, useMemo } from 'react'
import { leadsService, type LeadListParams } from '@/lib/services'
import { useApi } from './useApi'
import type { Lead, PaginatedResponse } from '@/lib/types'

export function useLeads(params: LeadListParams = {}) {
  const deps = [params.status, params.saved, params.search, params.page, params.pageSize]
  const fetcher = useCallback(
    () => leadsService.list(params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  )

  return useApi<PaginatedResponse<Lead>>(fetcher)
}

export function useLead(id: string | null) {
  const fetcher = useCallback(() => leadsService.getById(id!), [id])

  return useApi<Lead>(fetcher)
}
