import axios from 'axios';
import config from '../config';
import Claim from '../models/claim.model';
import User from '../models/user.model';
import ErrorResponse from '../utils/error-response.utils';
import prisma from '../lib/prisma';

export type OutreachDraft = {
    claim_id: string;
    lead_id: string;
    subject: string;
    body: string;
    generated_at: string | null;
};

function stripCodeFences(text: string): string {
    return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function parseOutreachResponse(raw: string): { subject: string; body: string } {
    const cleaned = stripCodeFences(raw);
    try {
        const parsed = JSON.parse(cleaned);
        const subject = String(parsed.subject || '').trim();
        const body = String(parsed.body || parsed.message || '').trim();
        if (subject && body) return { subject, body };
    } catch {
        // fall through to plain-text parse
    }

    const subjectMatch = cleaned.match(/subject\s*:\s*(.+)/i);
    const bodyMatch = cleaned.match(/body\s*:\s*([\s\S]+)/i);
    if (subjectMatch && bodyMatch) {
        return {
            subject: subjectMatch[1].trim(),
            body: bodyMatch[1].trim(),
        };
    }

    throw new ErrorResponse('AI returned an invalid outreach draft. Please try again.', 502);
}

export async function getOutreachDraft(userId: string, claimId: string): Promise<OutreachDraft> {
    const claim = await Claim.findOne({ _id: claimId, userId }, { populate: 'leadId' });
    if (!claim) {
        throw new ErrorResponse('Claim not found or unauthorized.', 404);
    }

    const lead = claim.leadId as any;
    return {
        claim_id: (claim._id || claim.id).toString(),
        lead_id: (lead?._id || lead?.id || claim.leadId)?.toString?.() || '',
        subject: claim.outreach_subject || '',
        body: claim.outreach_body || '',
        generated_at: claim.outreach_generated_at
            ? new Date(claim.outreach_generated_at).toISOString()
            : null,
    };
}

export async function generateOutreachDraft(
    userId: string,
    claimId: string,
    options?: { tone?: string; regenerate?: boolean }
): Promise<OutreachDraft> {
    const apiKey = config.openRouter.apiKey;
    if (!apiKey?.trim()) {
        throw new ErrorResponse(
            'OPEN_ROUTER_API is not configured. Add it to the backend environment to generate outreach.',
            503
        );
    }

    const claim = await Claim.findOne({ _id: claimId, userId }, { populate: 'leadId' });
    if (!claim) {
        throw new ErrorResponse('Claim not found or unauthorized. Claim the lead first.', 404);
    }

    if (!options?.regenerate && claim.outreach_subject && claim.outreach_body) {
        return getOutreachDraft(userId, claimId);
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ErrorResponse('User not found.', 404);
    }

    const lead = claim.leadId as any;
    if (!lead?.content) {
        throw new ErrorResponse('Lead content is missing.', 400);
    }

    const tone = (options?.tone || 'professional').trim();
    const senderName = user.name || 'there';
    const senderCompany =
        (typeof user.organization === 'object' && user.organization?.name) ||
        'our team';

    const prompt = `Write a short cold outreach email for this social lead.

Sender:
- Name: ${senderName}
- Company/team: ${senderCompany}

Lead:
- Name: ${lead.author?.name || 'there'}
- Platform: ${lead.platform || 'social'}
- Post: """${String(lead.content).slice(0, 1500)}"""
- Intelligence notes (optional): """${String(lead.intelligence || '').slice(0, 1200)}"""

Tone: ${tone}
Rules:
- Personalized to the post
- 80-140 words
- No fake claims
- Clear soft CTA
- Return ONLY valid JSON: {"subject":"...","body":"..."}`;

    let raw = '';
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: config.openRouter.intelModel,
                max_tokens: Math.min(config.openRouter.intelMaxTokens, 800),
                temperature: 0.6,
                messages: [
                    {
                        role: 'system',
                        content:
                            'You write concise B2B outreach emails. Always respond with JSON only: {"subject":"...","body":"..."}.',
                    },
                    { role: 'user', content: prompt },
                ],
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'HTTP-Referer': process.env.FRONTEND_URL || 'https://leadhunter.app',
                    'X-Title': 'Lead Hunter Outreach',
                    'Content-Type': 'application/json',
                },
                timeout: 60000,
            }
        );
        raw = response.data?.choices?.[0]?.message?.content || '';
    } catch (error: any) {
        const detail =
            error.response?.data?.error?.message ||
            error.response?.data?.error ||
            error.message ||
            'OpenRouter request failed';
        throw new ErrorResponse(`Outreach generation failed: ${detail}`, 502);
    }

    const { subject, body } = parseOutreachResponse(raw);
    const generatedAt = new Date();

    await prisma.claim.update({
        where: { id: (claim._id || claim.id).toString() },
        data: {
            outreach_subject: subject,
            outreach_body: body,
            outreach_generated_at: generatedAt,
        },
    });

    return {
        claim_id: (claim._id || claim.id).toString(),
        lead_id: (lead._id || lead.id).toString(),
        subject,
        body,
        generated_at: generatedAt.toISOString(),
    };
}

export async function saveOutreachDraft(
    userId: string,
    claimId: string,
    subject: string,
    body: string
): Promise<OutreachDraft> {
    const claim = await Claim.findOne({ _id: claimId, userId }, { populate: 'leadId' });
    if (!claim) {
        throw new ErrorResponse('Claim not found or unauthorized.', 404);
    }

    const nextSubject = subject.trim();
    const nextBody = body.trim();
    if (!nextSubject || !nextBody) {
        throw new ErrorResponse('subject and body are required.', 400);
    }

    const updated = await prisma.claim.update({
        where: { id: (claim._id || claim.id).toString() },
        data: {
            outreach_subject: nextSubject,
            outreach_body: nextBody,
        },
        include: { lead: true },
    });

    return {
        claim_id: updated.id,
        lead_id: updated.leadId,
        subject: updated.outreach_subject || '',
        body: updated.outreach_body || '',
        generated_at: updated.outreach_generated_at
            ? updated.outreach_generated_at.toISOString()
            : null,
    };
}
