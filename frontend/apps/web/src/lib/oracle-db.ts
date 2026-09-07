/**
 * Database client for lead_posts table.
 * Following the schema merger, lead_posts is part of the primary unified schema in db.
 * This file re-exports `db` as `oracleDb` for full backward compatibility across API routes.
 */
import { db } from '@/lib/db'
import type { LeadPost } from '@prisma/client'

export const oracleDb = db

export type OracleLeadPost = LeadPost
