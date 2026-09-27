import { describe, it, expect } from 'vitest'
import { renderEmailVerification, renderBroadcastAnnouncement } from './index'

describe('renderEmailVerification', () => {
  it('renders correctly with user name and gold brand color', async () => {
    const data = {
      name: 'Alex Hunter',
      email: 'alex@example.com',
      verificationUrl: 'https://leadhunterclub.com/verify-email?oobCode=xyz123',
      appUrl: 'https://leadhunterclub.com',
    }

    const { subject, text, html } = await renderEmailVerification(data)

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
    expect(html).toContain('#FFB800')
  })

  it('renders correctly without user name (fallback greeting)', async () => {
    const data = {
      email: 'newuser@example.com',
      verificationUrl: 'https://leadhunterclub.com/verify-email?oobCode=abc789',
      appUrl: 'https://leadhunterclub.com',
    }

    const { subject, text, html } = await renderEmailVerification(data)

    expect(subject).toContain('Verify your email address')
    expect(text).toMatch(/Hi (there|Hunter),/)
    expect(html).toMatch(/Hi (there|Hunter),/)
    expect(html).toContain(data.verificationUrl)
    expect(html).toContain('#FFB800')
  })
})

describe('renderBroadcastAnnouncement', () => {
  it('interpolates variables, fallbacks name, auto-links URLs, and sets gold refill CTA', () => {
    const result = renderBroadcastAnnouncement({
      subject: 'Special Refill Bonus for {{name}}!',
      messageText: 'Hey {{name}},\n\nClaim your extra credits now at {{appUrl}}/refill.\n\nHappy hunting!',
      appUrl: 'https://leadhunterclub.com',
    })

    expect(result.subject).toBe('Special Refill Bonus for there!')
    expect(result.text).toContain('Hey there,')
    expect(result.text).toContain('https://leadhunterclub.com/refill')

    expect(result.html).toContain('Hey there,')
    expect(result.html).toContain('Claim Refill Credits')
    expect(result.html).toContain('https://leadhunterclub.com/refill')
    expect(result.html).toContain('#FFB800')
    expect(result.html).toContain('color:#0a0a0a')
  })

  it('renders with personalized name when provided', () => {
    const result = renderBroadcastAnnouncement({
      name: 'Yash',
      subject: 'Product Update',
      messageText: 'Hey {{name}},\n\nCheck out the dashboard at {{appUrl}}/dashboard.',
      appUrl: 'https://leadhunterclub.com',
    })

    expect(result.subject).toBe('Product Update')
    expect(result.text).toContain('Hey Yash,')
    expect(result.html).toContain('Hey Yash,')
    expect(result.html).toContain('Open Lead Hunter Dashboard')
    expect(result.html).toContain('#FFB800')
  })
})

