'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ConfirmContent() {
  const params = useSearchParams()
  const email = params.get('email')
  const token = params.get('token')
  const [state, setState] = useState<'loading' | 'done' | 'invalid'>('loading')

  useEffect(() => {
    if (!email || !token) {
      setState('invalid')
      return
    }
    fetch(`/api/newsletter/confirm?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`)
      .then((res) => setState(res.ok ? 'done' : 'invalid'))
      .catch(() => setState('invalid'))
  }, [email, token])

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center px-6">
      <div className="metallic-card max-w-md w-full p-10 text-center">
        <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-3">
          {state === 'done' ? 'Subscription confirmed!' : state === 'invalid' ? 'Invalid link' : 'Confirming...'}
        </h1>
        <p className="text-text-secondary text-sm mb-8">
          {state === 'done'
            ? 'Thanks for confirming. You\'ll now receive the Lead Hunter Club newsletter.'
            : state === 'invalid'
              ? 'This confirmation link is invalid or has already been used.'
              : 'Please wait...'}
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl bg-accent-mint text-text-on-accent text-sm font-bold hover:brightness-110 transition-all"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  )
}