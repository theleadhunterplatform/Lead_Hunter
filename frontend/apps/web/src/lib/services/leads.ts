import { api } from '@/lib/api'
import type {
  Lead,
  CreateLeadInput,
  UpdateLeadInput,
  PaginatedResponse,
  LeadStatus,
} from '@/lib/types'

export interface LeadListParams {
  status?: LeadStatus | 'all'
  saved?: boolean | 'outreach'
  search?: string
  page?: number
  pageSize?: number
}

function toQueryParams(params: LeadListParams): Record<string, string | number | undefined> {
  return {
    status: params.status !== 'all' ? params.status : undefined,
    saved: params.saved === true ? 'true' : params.saved === 'outreach' ? 'outreach' : undefined,
    search: params.search,
    page: params.page,
    pageSize: params.pageSize,
  }
}

export const leadsService = {
  list: (params: LeadListParams = {}) =>
    api.get<PaginatedResponse<Lead>>('/leads', toQueryParams(params)),

  getById: (id: string) => api.get<Lead>(`/leads/${id}`),

  create: (input: CreateLeadInput) => api.post<Lead>('/leads', input),

  update: (id: string, input: UpdateLeadInput) => api.patch<Lead>(`/leads/${id}`, input),

  remove: (id: string) => api.delete<void>(`/leads/${id}`),

  getNewLeads: (page?: number) => leadsService.list({ status: 'new', page, pageSize: 50 }),

  getSavedLeads: (page?: number) => leadsService.list({ saved: true, page, pageSize: 50 }),

  getOutreachLeads: (page?: number) => leadsService.list({ saved: 'outreach', page, pageSize: 50 }),
}
