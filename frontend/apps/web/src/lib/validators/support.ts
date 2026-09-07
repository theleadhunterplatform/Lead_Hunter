import { z } from 'zod'

export const TICKET_CATEGORIES = ['general', 'billing', 'leads', 'account', 'technical'] as const
export type TicketCategory = (typeof TICKET_CATEGORIES)[number]

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]

export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export const createTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject is too long'),
  category: z.enum(TICKET_CATEGORIES).default('general'),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  firstMessage: z.string().min(1, 'Message is required').max(5000, 'Message is too long'),
})

export const createTicketMessageSchema = z.object({
  body: z.string().min(1, 'Message is required').max(5000, 'Message is too long'),
  isInternal: z.boolean().optional(),
})

export const updateTicketStatusSchema = z.object({
  status: z.enum([...TICKET_STATUSES, 'CLOSE']).optional(),
})

export const adminUpdateTicketSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  assigneeId: z.string().optional().nullable(),
})