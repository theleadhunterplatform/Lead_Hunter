import { describe, it, expect } from 'vitest'
import { renderEmailVerification } from './index'

describe('renderEmailVerification', () => {
  it('renders correctly with user name', () => {
    const data = {
      name: 'Alex Hunter',
      email: 'alex@example.com',
      verificationUrl: 'https://leadhunterclub.com/verify-email?oobCode=xyz123',
      appUrl: 'https://leadhunterclub.com',
    }

    const { subject, text, html } = renderEmailVerification(data)

    expect(subject).toContain('Verify your email address')
    expect(subject).toContain('Lead Hunter Club')

    expect(text).toContain('Hi Alex Hunter,')
    expect(text).toContain(data.verificationUrl)
    expect(text).toContain('24 hours')

    expect(html).toContain('Hi Alex Hunter,')
    expect(html).toContain(data.verificationUrl)
    expect(html).toContain('Verify Email Address')
    expect(html).toContain('Lead Hunter Club')
    expect(html).toContain('24 hours')
    expect(html).toContain('#dc3b4c')
  })

  it('renders correctly without user name (fallback greeting)', () => {
    const data = {
      email: 'newuser@example.com',
      verificationUrl: 'https://leadhunterclub.com/verify-email?oobCode=abc789',
      appUrl: 'https://leadhunterclub.com',
    }

    const { subject, text, html } = renderEmailVerification(data)

    expect(subject).toContain('Verify your email address')
    expect(text).toContain('Welcome to Lead Hunter Club,')
    expect(html).toContain('Welcome to Lead Hunter Club,')
    expect(html).toContain(data.verificationUrl)
  })
})
