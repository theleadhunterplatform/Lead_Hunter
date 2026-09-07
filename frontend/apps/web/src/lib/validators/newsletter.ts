import { z } from 'zod'

export const validEmail = z.string().trim().toLowerCase().email('Please enter a valid email address')

export const subscribeSchema = z.object({
  email: validEmail,
  source: z.string().max(32).optional(),
})

export const unsubscribeSchema = z.object({
  email: validEmail,
  token: z.string().min(1, 'Token is required').max(100),
})

export const statusSchema = z.object({
  email: validEmail,
})

export const broadcastSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject is too long'),
  bodyHtml: z.string().min(1, 'Message is required').max(100000),
  bodyText: z.string().min(1, 'Plain text is required').max(100000),
})

export const updateSubscriberSchema = z.object({
  email: validEmail,
  status: z.enum(['SUBSCRIBED', 'UNSUBSCRIBED', 'BOUNCED']),
})