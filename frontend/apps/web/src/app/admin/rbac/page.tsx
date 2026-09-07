'use client'

import { useState, useEffect } from 'react'
import { getFirebaseToken } from '@/lib/firebase'
import {
  ShieldCheckIcon, PlusIcon, TrashIcon, CheckIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/solid'
import { CustomLoader } from '@/components/ui/CustomLoader'



interface Role {
  _id: string
  id: string
  name: string
  slug: string
  description: string | null
  permissions: string[]
  scopeType: string
  isSystemRole: boolean
  scope: { type: string; organizationId: string | null }
}

interface Assignment {
  _id: string
  id: string
  userId: string | { _id: string; id: string; name: string; email: string }
  roleId: Role | string | null
  scope: { type: string; organizationId: string | null }
  expiresAt: string | null
}

type Tab = 'roles' | 'assignments'

const ALL_PERMISSIONS = [
  'lead:read', 'lead:hunt', 'keyword:create', 'keyword:update', 'keyword:delete',
  'target:read', 'target:create', 'target:update', 'target:delete',
  'scraping:manage', 'scraper:run',
  'user:read', 'user:create', 'user:update',
  'role:read', 'role:create', 'role:update', 'role:assign',
  'system:admin',
]

export default function AdminRBACPage() {
  const [activeTab, setActiveTab] = useState<Tab>('roles')
  const [roles, setRoles] = useState<Role[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: '', scopeType: 'organization' })
  const [newAssignment, setNewAssignment] = useState({ userId: '', roleId: '', scopeType: 'organization', expiresAt: '' })

  const fetchData = async () => {
    const token = await getFirebaseToken()
    if (!token) return
    setLoading(true)
    try {
      const [rolesRes, assignmentsRes, usersRes] = await Promise.all([
        fetch('/api/admin/rbac/roles', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/admin/rbac/assignments', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/admin/users?pageSize=500', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ])
      setRoles(rolesRes.data || [])
      setAssignments(assignmentsRes.data || [])
      setUsers((usersRes.data || []).map((u: any) => ({ id: u.id, name: u.name, email: u.email })))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const createRole = async () => {
    if (!newRole.name.trim()) return
    const token = await getFirebaseToken()
    const perms = newRole.permissions.split(',').map(p => p.trim()).filter(Boolean)
    const res = await fetch('/api/admin/rbac/roles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRole.name.trim(), description: newRole.description.trim() || undefined, permissions: perms, scopeType: newRole.scopeType }),
    })
    if (res.ok) {
      setNewRole({ name: '', description: '', permissions: '', scopeType: 'organization' })
      fetchData()
    }
  }

  const createAssignment = async () => {
    if (!newAssignment.userId || !newAssignment.roleId) return
    const token = await getFirebaseToken()
    await fetch('/api/admin/rbac/assignments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: newAssignment.userId,
        roleId: newAssignment.roleId,
        scope: { type: newAssignment.scopeType },
        expiresAt: newAssignment.expiresAt || null,
      }),
    })
    setNewAssignment({ userId: '', roleId: '', scopeType: 'organization', expiresAt: '' })
    fetchData()
  }

  const deleteAssignment = async (id: string) => {
    const token = await getFirebaseToken()
    await fetch(`/api/admin/rbac/assignments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    fetchData()
  }

  const getUserName = (u: string | { _id?: string; name?: string; email?: string } | null): string => {
    if (!u) return 'Unknown'
    if (typeof u === 'string') return users.find(x => x.id === u)?.name || u
    return (u as any).name || (u as any).email || 'Unknown'
  }

  const getRoleName = (r: Role | string | null): string => {
    if (!r) return 'Unknown'
    if (typeof r === 'string') return roles.find(x => x.id === r)?.name || r
    return r.name
  }

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">RBAC Engine</h1>
        <p className="text-sm text-text-secondary mt-1">Manage roles and permissions</p>
      </div>

      <div className="flex gap-1 mb-6 bg-surface/20 rounded-xl p-1 border border-white/[0.06] w-fit">
        <button onClick={() => setActiveTab('roles')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'roles' ? 'bg-accent-mint text-white' : 'text-text-secondary hover:text-text-primary'}`}>
          Roles
        </button>
        <button onClick={() => setActiveTab('assignments')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'assignments' ? 'bg-accent-mint text-white' : 'text-text-secondary hover:text-text-primary'}`}>
          Assignments
        </button>
      </div>

      {loading ? (
        <CustomLoader page="admin" />
      ) : activeTab === 'roles' ? (
        <div>
          <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <PlusIcon className="w-4 h-4 text-accent-mint" />Create Role
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <input value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })} placeholder="Role name"
                className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-2.5 text-sm"
              />
              <input value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} placeholder="Description"
                className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-2.5 text-sm"
              />
              <select value={newRole.scopeType} onChange={e => setNewRole({ ...newRole, scopeType: e.target.value })}
                className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-2.5 text-sm">
                <option value="organization">Organization</option>
                <option value="global">Global</option>
              </select>
            </div>
            <input value={newRole.permissions} onChange={e => setNewRole({ ...newRole, permissions: e.target.value })} placeholder="Permissions (comma-separated, e.g. lead:read,user:create)"
              className="w-full bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-2.5 text-sm mb-3"
            />
            <div className="flex flex-wrap gap-1.5 mb-3">
              {ALL_PERMISSIONS.map(p => (
                <button key={p} onClick={() => {
                  const current = newRole.permissions.split(',').map(x => x.trim()).filter(Boolean)
                  const updated = current.includes(p) ? current.filter(x => x !== p) : [...current, p]
                  setNewRole({ ...newRole, permissions: updated.join(',') })
                }}
                  className={`px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider transition-all ${
                    newRole.permissions.includes(p) ? 'bg-accent-mint/20 text-accent-mint border border-accent-mint/30' : 'bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10'
                  }`}>{p}</button>
              ))}
            </div>
            <button onClick={createRole} disabled={!newRole.name.trim()}
              className="px-5 py-2.5 rounded-xl bg-accent-mint text-white text-sm font-medium hover:bg-accent-mint/90 transition-all disabled:opacity-50">
              <CheckIcon className="w-4 h-4 inline mr-1.5" />Create Role
            </button>
          </div>

          <div className="relative max-w-xs mb-6">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/40" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search roles..."
              className="w-full bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all pl-10 pr-4 py-2.5 text-sm"
            />
          </div>

          <div className="space-y-3">
            {filteredRoles.length === 0 ? (
              <p className="text-center text-sm text-text-secondary py-12">No roles found</p>
            ) : filteredRoles.map(r => (
              <div key={r._id || r.id} className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{r.name}</h3>
                    <p className="text-[10px] text-text-secondary font-mono">{r.slug}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    r.scopeType === 'global' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>{r.scopeType}</span>
                </div>
                {r.description && <p className="text-xs text-text-secondary mb-3">{r.description}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {r.permissions.map(p => (
                    <span key={p} className="px-2 py-0.5 rounded bg-accent-mint/10 text-accent-mint text-[10px] font-medium">{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <PlusIcon className="w-4 h-4 text-accent-mint" />Assign Role
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <select value={newAssignment.userId} onChange={e => setNewAssignment({ ...newAssignment, userId: e.target.value })}
                className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-2.5 text-sm">
                <option value="">Select user...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
              <select value={newAssignment.roleId} onChange={e => setNewAssignment({ ...newAssignment, roleId: e.target.value })}
                className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-2.5 text-sm">
                <option value="">Select role...</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <select value={newAssignment.scopeType} onChange={e => setNewAssignment({ ...newAssignment, scopeType: e.target.value })}
                className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-2.5 text-sm">
                <option value="organization">Organization</option>
                <option value="global">Global</option>
              </select>
              <input type="date" value={newAssignment.expiresAt} onChange={e => setNewAssignment({ ...newAssignment, expiresAt: e.target.value })}
                className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-2.5 text-sm"
              />
            </div>
            <button onClick={createAssignment} disabled={!newAssignment.userId || !newAssignment.roleId}
              className="px-5 py-2.5 rounded-xl bg-accent-mint text-white text-sm font-medium hover:bg-accent-mint/90 transition-all disabled:opacity-50">
              <PlusIcon className="w-4 h-4 inline mr-1.5" />Assign
            </button>
          </div>

          <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">User</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Scope</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Expires</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-text-secondary">No assignments</td></tr>
                ) : assignments.map(a => (
                  <tr key={a._id || a.id} className="border-b border-white/[0.03]">
                    <td className="px-6 py-4 text-sm text-text-primary">{getUserName(a.userId)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-accent-mint/10 text-accent-mint text-[10px] font-medium">
                        {getRoleName(a.roleId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">{a.scope?.type || 'global'}</td>
                    <td className="px-6 py-4 text-sm text-text-secondary">{a.expiresAt ? new Date(a.expiresAt).toLocaleDateString() : 'Never'}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => deleteAssignment(a._id || a.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-all">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
