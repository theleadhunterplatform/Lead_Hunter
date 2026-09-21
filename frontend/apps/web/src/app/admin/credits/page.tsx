'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getFirebaseToken } from '@/lib/firebase'
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid'
import { CustomLoader } from '@/components/ui/CustomLoader'


interface CreditAccountInfo {
  subscriptionBalance: number
  bonusBalance: number
  total: number
}

interface AdminUser {
  id: string
  email: string
  name: string
  creditAccount: CreditAccountInfo
  status: string
  plan: string
}

export default function AdminCreditsPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  useEffect(() => {
    getFirebaseToken().then((token) => {
      if (!token) return
      fetch('/api/admin/users?pageSize=100', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((res) => {
          setUsers(res.data || [])
          const values: Record<string, string> = {}
          res.data?.forEach((u: AdminUser) => {
            values[u.id] = (u.creditAccount?.total ?? 0).toString()
          })
          setEditValues(values)
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    })
  }, [])

  const handleGrantBonus = async (userId: string) => {
    setUpdating(userId)
    const token = await getFirebaseToken()
    const amount = parseInt(editValues[userId])
    if (isNaN(amount) || amount <= 0) return

    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bonusCredits: amount }),
    })
    const json = await res.json()
    if (json.data?.creditAccount) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, creditAccount: json.data.creditAccount } : u)),
      )
      setEditValues((prev) => ({ ...prev, [userId]: '' }))
    }
    setUpdating(null)
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Credit Management</h1>
        <p className="text-sm text-text-secondary mt-1">Adjust user credits manually</p>
      </div>

      <div className="relative max-w-xs mb-6">
        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all pl-10 pr-4 py-2.5 text-sm"
        />
      </div>

      {loading ? (
        <CustomLoader page="admin" />
      ) : (
        <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Plan
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Subscription
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Bonus
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Total
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Grant Bonus
                </th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-text-secondary">
                    No users found
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="border-b border-white/[0.03]">
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-sm font-medium text-text-primary hover:text-accent-mint transition-colors"
                      >
                        {u.name}
                      </Link>
                      <p className="text-xs text-text-secondary">{u.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-text-secondary">{u.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">{u.plan}</td>
                    <td className="px-6 py-4 text-sm text-text-primary">
                      {u.creditAccount?.subscriptionBalance ?? 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-primary">
                      {u.creditAccount?.bonusBalance ?? 0}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-text-primary">
                      {u.creditAccount?.total ?? 0}
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={editValues[u.id] ?? ''}
                        onChange={(e) => setEditValues({ ...editValues, [u.id]: e.target.value })}
                        min="0"
                        placeholder="Amount"
                        className="w-20 bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleGrantBonus(u.id)}
                        disabled={updating === u.id}
                        className="px-4 py-1.5 rounded-lg bg-accent-mint text-white text-xs font-medium hover:bg-accent-mint/90 transition-all disabled:opacity-50"
                      >
                        {updating === u.id ? '...' : 'Grant'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
