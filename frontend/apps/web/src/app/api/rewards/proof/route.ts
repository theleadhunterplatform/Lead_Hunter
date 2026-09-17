import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthRequiredError } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const VALID_TYPES = ['POSITIVE_REPLY', 'MEETING_SCHEDULED', 'DEAL_CLOSED']

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request)

    const proofs = await db.milestoneProof.findMany({
      where: { userId: authUser.uid },
      orderBy: { createdAt: 'desc' },
    })

    const totalApprovedCredits = proofs
      .filter((p) => p.status === 'APPROVED')
      .reduce((sum, p) => sum + (p.creditsAwarded || 0), 0)

    return NextResponse.json({
      success: true,
      data: {
        proofs,
        totalApprovedCredits,
        pendingCount: proofs.filter((p) => p.status === 'PENDING').length,
      },
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }
    console.error('[Rewards Proof GET] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve milestone proofs' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request)

    let type: string | null = null
    let note: string | null = null
    let imageUrl: string | null = null

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      type = (formData.get('type') as string) || null
      note = (formData.get('note') as string) || null
      const file = formData.get('file') as File | null

      if (file && file.size > 0) {
        // Enforce 10MB limit on server
        if (file.size > 10 * 1024 * 1024) {
          return NextResponse.json(
            { success: false, message: 'Image size must be under 10MB' },
            { status: 400 },
          )
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const mimeType = file.type || 'image/jpeg'
        imageUrl = `data:${mimeType};base64,${buffer.toString('base64')}`
      }
    } else {
      const body = await request.json().catch(() => ({}))
      type = body.type || null
      note = body.note || null
      imageUrl = body.imageUrl || null
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid milestone category' },
        { status: 400 },
      )
    }

    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
      return NextResponse.json(
        { success: false, message: 'Valid screenshot proof is required' },
        { status: 400 },
      )
    }

    const proof = await db.milestoneProof.create({
      data: {
        userId: authUser.uid,
        type,
        imageUrl: imageUrl.trim(),
        note: typeof note === 'string' ? note.trim().slice(0, 500) : null,
        status: 'PENDING',
        creditsAwarded: 0,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Milestone screenshot submitted for review!',
        data: proof,
      },
      { status: 201 },
    )
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }
    console.error('[Rewards Proof POST] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to submit milestone proof' },
      { status: 500 },
    )
  }
}
