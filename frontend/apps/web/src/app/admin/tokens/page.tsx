'use client'

import { useState, useEffect, useCallback } from 'react'
import { getFirebaseToken } from '@/lib/firebase'
import {
  KeyIcon, PlusIcon, TrashIcon, ShieldCheckIcon, ShieldExclamationIcon,
  EyeIcon, EyeSlashIcon, CheckCircleIcon, ArrowPathIcon, Cog6ToothIcon,
} from '@heroicons/react/24/solid'
import { CustomLoader } from '@/components/ui/CustomLoader'
import { useToast } from '@/components/ui/Toast'

interface ApifyKey {
  _id: string
  id: string
  key: string
  label: string | null
  is_active: boolean
  comments_used: number
  comments_limit: number
  comments_remaining: number
  assigned_worker: string | null
}

interface AutomationSettings {
  auto_scrape_enabled: boolean
  auto_enrichment_enabled: boolean
  keep_alive_enabled: boolean
  keep_alive_configured: boolean
  scrape_interval_minutes: number
  keep_alive_interval_minutes: number
}

export default function AdminTokensPage() {
  const [tokens, setTokens] = useState<ApifyKey[]>([])
  const [loading, setLoading] = useState(true)
  const [newKey, setNewKey] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const { addToast } = useToast()

  const [enrichmentKeys, setEnrichmentKeys] = useState<Record<string, { is_configured: boolean; value: string }>>({})
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings | null>(null)
  const [automationLoading, setAutomationLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [showValues, setShowValues] = useState<Record<string, boolean>>({})

  const apiCall = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getFirebaseToken()
    if (!token) throw new Error('Not authenticated')
    const res = await fetch(path, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.message || `Request failed: ${res.status}`)
    return json
  }, [])

  const fetchTokens = useCallback(async () => {
    const token = await getFirebaseToken()
    if (!token) return
    try {
      const res = await fetch('/api/admin/apify-keys', { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      setTokens(json.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  const fetchEnrichmentKeys = useCallback(async () => {
    try {
      const [intel, compass, hunter, contactout, apollo] = await Promise.all([
        apiCall('/api/admin/settings?service=openrouter'),
        apiCall('/api/admin/settings?service=contact-compass'),
        apiCall('/api/admin/settings?service=hunter'),
        apiCall('/api/admin/settings?service=contactout'),
        apiCall('/api/admin/settings?service=apollo'),
      ])
      const d = (r: { data?: Record<string, unknown> }) => r?.data || {}
      const newStates = {
        'OpenRouter API Key': {
          is_configured: Boolean(d(intel).is_configured),
          value: (d(intel).api_key as string) || '',
        },
        'Contact Compass Token': {
          is_configured: Boolean(d(compass).is_configured),
          value: (d(compass).token as string) || '',
        },
        'Hunter.io API Key': {
          is_configured: Boolean(d(hunter).is_configured),
          value: (d(hunter).api_key as string) || '',
        },
        'ContactOut API Token': {
          is_configured: Boolean(d(contactout).is_configured),
          value: (d(contactout).token as string) || '',
        },
        'Apollo.io API Key': {
          is_configured: Boolean(d(apollo).is_configured),
          value: (d(apollo).api_key as string) || '',
        },
      }
      setEnrichmentKeys(newStates)
    } catch (error) {
      console.error('Failed to load enrichment keys:', error)
    }
  }, [apiCall])

  const fetchAutomationSettings = useCallback(async () => {
    setAutomationLoading(true)
    try {
      const res = await apiCall('/api/admin/settings?service=automation')
      if (res?.data) setAutomationSettings(res.data as AutomationSettings)
    } catch (error) {
      console.error('Failed to load automation settings:', error)
    } finally {
      setAutomationLoading(false)
    }
  }, [apiCall])

  useEffect(() => {
    fetchTokens()
    fetchEnrichmentKeys()
    fetchAutomationSettings()
  }, [fetchTokens, fetchEnrichmentKeys, fetchAutomationSettings])

  const addKey = async () => {
    if (!newKey.trim()) return
    const token = await getFirebaseToken()
    const res = await fetch('/api/admin/apify-keys', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: newKey.trim(), label: newLabel.trim() || undefined }),
    })
    if (res.ok) {
      setNewKey(''); setNewLabel('')
      fetchTokens()
    }
  }

  const deleteKey = async (id: string) => {
    const token = await getFirebaseToken()
    await fetch(`/api/admin/apify-keys/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    fetchTokens()
  }

  const handleEnrichmentSave = async (service: string, label: string, value: string) => {
    if (!value?.trim()) {
      addToast({ type: 'error', message: 'Please enter a value' })
      return
    }
    // Real backend payloads: token-based services vs api_key-based services.
    const body =
      service === 'hunter' || service === 'apollo' || service === 'openrouter'
        ? { api_key: value.trim() }
        : { token: value.trim() }
    setSaving(label)
    try {
      await apiCall(`/api/admin/settings?service=${service}`, { method: 'POST', body: JSON.stringify(body) })
      addToast({ type: 'success', message: `${label} updated successfully` })
      const fresh = await apiCall(`/api/admin/settings?service=${service}`)
      const data = fresh?.data || {}
      setEnrichmentKeys(prev => ({
        ...prev,
        [label]: {
          is_configured: Boolean(data.is_configured),
          value: value.trim(),
        },
      }))
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update setting'
      addToast({ type: 'error', message: msg })
    } finally {
      setSaving(null)
    }
  }

  const handleAutomationSave = async (key: 'auto_scrape_enabled' | 'auto_enrichment_enabled' | 'keep_alive_enabled') => {
    if (!automationSettings) return
    const newValue = !automationSettings[key]
    setSaving(key)
    try {
      const res = await apiCall('/api/admin/settings?service=automation', {
        method: 'POST',
        body: JSON.stringify({ [key]: newValue }),
      })
      if (res?.data) setAutomationSettings(res.data as AutomationSettings)
      addToast({ type: 'success', message: 'Automation setting updated' })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update setting'
      addToast({ type: 'error', message: msg })
    } finally {
      setSaving(null)
    }
  }

  const enrichmentFields = [
    {
      service: 'openrouter',
      label: 'OpenRouter API Key',
      description: 'Used for AI intelligence reports and lead enrichment. Editable from this page.',
      placeholder: 'sk-or-v1-...',
      icon: Cog6ToothIcon,
    },
    {
      service: 'contact-compass',
      label: 'Contact Compass Token',
      description: 'Primary email finder service. Used for discovering contact emails from LinkedIn profiles.',
      placeholder: 'cc_...',
      icon: KeyIcon,
    },
    {
      service: 'hunter',
      label: 'Hunter.io API Key',
      description: 'Email verification and domain search service. Used to verify discovered email addresses.',
      placeholder: 'hunter_...',
      icon: ShieldCheckIcon,
    },
    {
      service: 'contactout',
      label: 'ContactOut API Token',
      description: 'Additional contact discovery service for emails and phone numbers.',
      placeholder: 'co_...',
      icon: KeyIcon,
    },
    {
      service: 'apollo',
      label: 'Apollo.io API Key',
      description: 'B2B contact and company database. Used for enrichment and lead discovery.',
      placeholder: 'apollo_...',
      icon: KeyIcon,
    },
  ]

  const automationItems = [
    {
      key: 'auto_scrape_enabled' as const,
      label: 'Auto Scrape (Every 30 min)',
      description: 'Automatically enqueue scraping jobs for all active keywords and watchlist targets every 30 minutes',
      icon: ArrowPathIcon,
    },
    {
      key: 'auto_enrichment_enabled' as const,
      label: 'Auto Enrichment',
      description: 'Automatically find contact details when a lead is marked relevant',
      icon: KeyIcon,
    },
    {
      key: 'keep_alive_enabled' as const,
      label: 'Keep Services Awake (Every 10 min)',
      description: 'Ping Render services (API, Frontend, AI) every 10 minutes to prevent idle sleep on free tier',
      icon: ShieldCheckIcon,
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">API Keys & Tokens</h1>
        <p className="text-sm text-text-secondary mt-1">Manage scraping and enrichment service credentials</p>
      </div>

      {loading ? (
        <CustomLoader page="admin" />
      ) : (
        <div className="space-y-6">
          <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <KeyIcon className="w-4 h-4 text-accent-mint" />Apify API Keys
            </h2>
            <div className="flex items-end gap-3 mb-6">
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1 block">API Key</label>
                <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="apify_api_..."
                  className="w-full bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-2.5 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1 block">Label</label>
                <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="My Key"
                  className="w-full bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-2.5 text-sm"
                />
              </div>
              <button onClick={addKey} disabled={!newKey.trim()}
                className="px-5 py-2.5 rounded-xl bg-accent-mint text-white text-sm font-medium hover:bg-accent-mint/90 transition-all disabled:opacity-50">
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {tokens.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-6">No API keys added yet</p>
              ) : tokens.map(k => (
                <div key={k._id || k.id} className="flex items-center justify-between bg-surface-elevated/50 rounded-xl px-4 py-3 border border-white/[0.03]">
                  <div className="flex items-center gap-3">
                    {k.is_active ? <ShieldCheckIcon className="w-4 h-4 text-green-400" /> : <ShieldExclamationIcon className="w-4 h-4 text-gray-500" />}
                    <div>
                      <p className="text-sm font-medium text-text-primary">{k.label || k.key.substring(0, 20)}...</p>
                      <p className="text-[10px] text-text-secondary">
                        Used: {k.comments_used}/{k.comments_limit} | Remaining: {k.comments_remaining}
                        {k.assigned_worker && <> | Worker: {k.assigned_worker}</>}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => deleteKey(k._id || k.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-all">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <KeyIcon className="w-4 h-4 text-accent-mint" />Enrichment Service Keys
            </h2>
            <p className="text-sm text-text-secondary mb-6">Configure API credentials for contact discovery, verification, and AI intelligence</p>

            <div className="space-y-4">
              {enrichmentFields.map((field) => {
                const state = enrichmentKeys[field.label]
                const isSaving = saving === field.label
                const show = showValues[field.label] || false
                return (
                  <div key={field.label} className="bg-surface-elevated/30 border border-white/[0.03] rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-accent-mint/10 rounded-lg flex items-center justify-center">
                        <field.icon className="w-4 h-4 text-accent-mint" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-text-primary">{field.label}</h3>
                        <p className="text-[10px] text-text-secondary">{field.description}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                        state?.is_configured
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {state?.is_configured ? 'Configured' : 'Not Set'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <input
                          type={show ? 'text' : 'password'}
                          value={state?.value || ''}
                          onChange={e => setEnrichmentKeys(prev => ({
                            ...prev,
                            [field.label]: { ...prev[field.label], value: e.target.value },
                          }))}
                          placeholder={field.placeholder}
                          disabled={isSaving}
                          className="w-full bg-surface-elevated border border-white/[0.08] text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowValues(prev => ({ ...prev, [field.label]: !prev[field.label] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                        >
                          {show ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        onClick={() => handleEnrichmentSave(field.service, field.label, state?.value || '')}
                        disabled={isSaving || !state?.value?.trim()}
                        className="h-10 px-5 rounded-lg bg-accent-mint text-black font-medium text-sm hover:bg-accent-mint/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon className="w-4 h-4" />
                            Save
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Cog6ToothIcon className="w-4 h-4 text-accent-mint" />Automation
            </h2>
            <p className="text-sm text-text-secondary mb-6">Configure background jobs for scraping, enrichment, and service keep-alive</p>

            {automationLoading ? (
              <div className="flex items-center justify-center py-8">
                <ArrowPathIcon className="w-6 h-6 animate-spin text-accent-mint mr-2" />
                <span className="text-text-secondary">Loading automation settings...</span>
              </div>
            ) : automationSettings ? (
              <div className="space-y-4">
                {automationItems.map((item) => (
                  <div key={item.key} className="bg-surface-elevated/30 border border-white/[0.03] rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-accent-mint/10 rounded-lg flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-accent-mint" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-text-primary">{item.label}</h3>
                        <p className="text-[10px] text-text-secondary">{item.description}</p>
                      </div>
                      <button
                        onClick={() => handleAutomationSave(item.key)}
                        disabled={saving === item.key || (item.key === 'keep_alive_enabled' && !automationSettings.keep_alive_configured)}
                        className={`h-10 px-5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                          automationSettings[item.key]
                            ? 'bg-green-500 text-black hover:bg-green-600'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-black'
                        } ${saving === item.key ? 'opacity-50 cursor-not-allowed' : ''} ${item.key === 'keep_alive_enabled' && !automationSettings.keep_alive_configured ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {saving === item.key ? (
                          <>
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : automationSettings[item.key] ? (
                          <>
                            <CheckCircleIcon className="w-4 h-4" />
                            Enabled
                          </>
                        ) : (
                          <>
                            <ShieldExclamationIcon className="w-4 h-4" />
                            Disabled
                          </>
                        )}
                      </button>
                    </div>
                    {item.key === 'keep_alive_enabled' && !automationSettings.keep_alive_configured && (
                      <p className="text-[10px] text-yellow-400">
                        Not configured — set FRONTEND_URL, AI_SERVICE_URL, or KEEP_ALIVE_URLS in backend environment
                      </p>
                    )}
                    {item.key === 'auto_scrape_enabled' && automationSettings.auto_scrape_enabled && (
                      <p className="text-[10px] text-accent-mint">
                        Runs every {automationSettings.scrape_interval_minutes} minutes for active keywords & LinkedIn watchlist targets
                      </p>
                    )}
                    {item.key === 'keep_alive_enabled' && automationSettings.keep_alive_enabled && (
                      <p className="text-[10px] text-accent-mint">
                        Pings every {automationSettings.keep_alive_interval_minutes} minutes
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <ShieldExclamationIcon className="w-8 h-8 mx-auto mb-2 text-red-400/50" />
                <p>Failed to load automation settings</p>
                <p className="text-[10px] mt-1">Check backend connectivity or authentication</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
