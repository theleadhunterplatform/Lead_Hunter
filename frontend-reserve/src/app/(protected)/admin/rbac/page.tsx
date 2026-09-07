"use client";

import { useEffect, useState } from "react";
import { Shield, Lock, Fingerprint, Users, Loader2, Plus, Save, Trash2, CheckSquare, Square, Search } from "lucide-react";
import { Button, Input } from "@/components/ui/HunterUI";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { ADMIN_ROUTES } from "@/lib/routes";

type Tab = "roles" | "assignments";

export default function RBACPage() {
  const { hasPermission, activeOrgId, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("roles");
  const [roles, setRoles] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // New Items State
  const [newRole, setNewRole] = useState({ name: "", description: "", permissions: "", scopeType: "organization" });
  const [newAssignment, setNewAssignment] = useState({ userId: "", roleId: "", scopeType: "organization", organizationId: "", expiresAt: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Use activeOrgId in queries if present
      const [rolesRes, assignmentsRes, usersRes] = await Promise.all([
        api.get("/rbac/roles"),
        api.get(`/rbac/role-assignments${activeOrgId ? `?orgId=${activeOrgId}` : ""}`),
        api.get("/auth/organization/users"),
      ]);
      setRoles(rolesRes.data.data);
      setAssignments(assignmentsRes.data.data);
      setUsers(usersRes.data.data);
    } catch (err) {
      console.error("Failed to fetch RBAC data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!hasPermission('role:read')) {
        router.push(ADMIN_ROUTES.dashboard);
        return;
      }
      fetchData();
    }
  }, [authLoading, hasPermission, activeOrgId, router]);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('role:create')) return;
    setSubmitting(true);
    try {
      const permsArray = newRole.permissions.split(",").map(p => p.trim()).filter(p => p);
      await api.post("/rbac/roles", { ...newRole, permissions: permsArray });
      setNewRole({ name: "", description: "", permissions: "", scopeType: "organization" });
      fetchData();
    } catch (err) {
      console.error("Failed to create role", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('role:assign')) return;
    setSubmitting(true);
    try {
      // Use activeOrgId as default if scope is organization
      const targetOrgId = newAssignment.scopeType === "organization"
        ? (newAssignment.organizationId || activeOrgId)
        : null;

      await api.post("/rbac/role-assignments", {
        userId: newAssignment.userId,
        roleId: newAssignment.roleId,
        scope: {
          type: newAssignment.scopeType,
          organizationId: targetOrgId
        },
        expiresAt: newAssignment.expiresAt || null
      });
      setNewAssignment({ userId: "", roleId: "", scopeType: "organization", organizationId: "", expiresAt: "" });
      fetchData();
    } catch (err) {
      console.error("Failed to create assignment", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeAssignment = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this access?")) return;
    setSubmitting(true);
    try {
      await api.delete(`/rbac/role-assignments/${id}`);
      fetchData();
    } catch (err) {
      console.error("Failed to revoke assignment", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-display font-black text-4xl uppercase tracking-tighter flex items-center gap-3">
            <Shield className="text-hunter-orange" size={32} />
            User <span className="text-hunter-orange">Permissions</span>
          </h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mt-2">
            Manage user roles and permissions.
          </p>
        </div>

        <div className="flex bg-hunter-grey neo-border border-zinc-800 p-1">
          {(["roles", "assignments"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 font-display font-bold uppercase text-[10px] tracking-widest transition-all ${activeTab === tab ? "bg-hunter-orange text-black" : "text-zinc-500 hover:text-white"
                }`}
            >
              {tab === "roles" ? "Roles" : "Assignments"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-12 h-12 text-hunter-orange animate-spin" />
          <p className="font-display font-bold uppercase tracking-widest text-xs text-zinc-500">Loading...</p>
        </div>
      ) : (
        <div className="grid gap-8">
          {activeTab === "roles" && (
            <div className="space-y-8">
              {/* Create Role */}
              {hasPermission('role:create') && (
                <div className="bg-hunter-grey p-8 neo-border border-zinc-800">
                  <h2 className="font-display font-black text-xl uppercase tracking-tighter mb-6 flex items-center gap-2">
                    <Plus size={20} className="text-hunter-orange" />
                    Create New Role
                  </h2>
                  <form onSubmit={handleCreateRole} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <Input
                        label="Role Name"
                        placeholder="e.g. Agency Manager"
                        value={newRole.name}
                        onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                        required
                      />
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Scope</label>
                        <select
                          className="bg-black border border-zinc-800 text-white p-3 font-display font-bold text-xs outline-none focus:border-hunter-orange transition-colors"
                          value={newRole.scopeType}
                          onChange={e => setNewRole({ ...newRole, scopeType: e.target.value })}
                        >
                          <option value="organization">Business-Specific</option>
                          <option value="global">All Businesses</option>
                        </select>
                      </div>
                    </div>
                    <Input
                      label="Permissions (Comma Separated)"
                      placeholder="user:read, lead:read, keyword:manage"
                      value={newRole.permissions}
                      onChange={e => setNewRole({ ...newRole, permissions: e.target.value })}
                      required
                    />
                    <div className="flex justify-end">
                      <Button type="submit" className="px-12" disabled={submitting}>
                        {submitting ? <Loader2 className="animate-spin mx-auto" /> : "Create Role"}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Roles List */}
              <div className="grid md:grid-cols-2 gap-4">
                {roles.map(role => (
                  <div key={role._id} className="bg-hunter-grey p-6 neo-border border-zinc-800 group hover:border-hunter-orange transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-display font-black text-2xl uppercase tracking-tighter">
                          {role.name}
                        </h3>
                        <div className="flex gap-2 mt-1">
                          <span className={`text-[8px] px-2 py-0.5 font-black uppercase tracking-tighter ${role.scopeType === 'global' ? 'bg-hunter-orange text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                            {role.scopeType}
                          </span>
                          {role.isSystemRole && (
                            <span className="text-[8px] border border-hunter-orange text-hunter-orange px-2 py-0.5 font-black uppercase tracking-tighter">System Protected</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions?.map((p: string) => (
                        <span key={p} className="text-[9px] font-mono bg-black text-zinc-400 px-2 py-1 neo-border border-zinc-800">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "assignments" && (
            <div className="space-y-8">
              {/* Create Assignment */}
              {hasPermission('role:assign') && (
                <div className="bg-hunter-grey p-8 neo-border border-zinc-800">
                  <h2 className="font-display font-black text-xl uppercase tracking-tighter mb-6 flex items-center gap-2">
                    <Plus size={20} className="text-hunter-orange" />
                    Assign Permissions
                  </h2>
                  <form onSubmit={handleCreateAssignment} className="grid md:grid-cols-4 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">User</label>
                      <select
                        className="bg-black border border-zinc-800 text-white p-3 font-display font-bold text-xs outline-none focus:border-hunter-orange transition-colors"
                        value={newAssignment.userId}
                        onChange={e => setNewAssignment({ ...newAssignment, userId: e.target.value })}
                        required
                      >
                        <option value="">Select Member...</option>
                        {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Role</label>
                      <select
                        className="bg-black border border-zinc-800 text-white p-3 font-display font-bold text-xs outline-none focus:border-hunter-orange transition-colors"
                        value={newAssignment.roleId}
                        onChange={e => setNewAssignment({ ...newAssignment, roleId: e.target.value })}
                        required
                      >
                        <option value="">Select Role...</option>
                        {roles.map(r => <option key={r._id} value={r._id}>{r.name} ({r.scopeType})</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Scope</label>
                      <select
                        className="bg-black border border-zinc-800 text-white p-3 font-display font-bold text-xs outline-none focus:border-hunter-orange transition-colors"
                        value={newAssignment.scopeType}
                        onChange={e => setNewAssignment({ ...newAssignment, scopeType: e.target.value })}
                        required
                      >
                        <option value="organization">Business</option>
                        <option value="global">All Businesses</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" className="w-full h-[46px]" disabled={submitting}>
                        {submitting ? <Loader2 className="animate-spin mx-auto" /> : "Assign Role"}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Assignments List */}
              <div className="grid gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-hunter-orange" size={20} />
                  <Input
                    placeholder="Search by name or email..."
                    className="pl-12"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>

                {assignments
                  .filter((a) => !a.userId?.is_deleted)
                  .filter(a => a.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || a.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(assignment => (
                    <div key={assignment._id} className="bg-hunter-grey p-6 neo-border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between group hover:border-hunter-orange transition-all">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-black neo-border border-zinc-800 flex items-center justify-center font-display font-black text-hunter-orange text-xl">
                          {assignment.userId?.name?.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-display font-black text-lg uppercase tracking-tighter">{assignment.userId?.name}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{assignment.userId?.email}</span>
                            <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                            <span className="text-hunter-orange text-[10px] font-black uppercase tracking-widest">{assignment.roleId?.name}</span>
                            <span className={`text-[8px] px-2 py-0.5 font-black uppercase tracking-tighter ${assignment.scope?.type === 'global' ? 'bg-hunter-orange text-black' : 'bg-zinc-900 text-zinc-500'}`}>
                              {assignment.scope?.type}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 mt-4 md:mt-0">
                        {assignment.expiresAt && (
                          <div className="text-right">
                            <div className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter">Ends On</div>
                            <div className="text-[10px] font-bold text-white uppercase">{new Date(assignment.expiresAt).toLocaleDateString()}</div>
                          </div>
                        )}
                        {hasPermission('role:assign') && (
                          <button
                            onClick={() => handleRevokeAssignment(assignment._id)}
                            className="p-3 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
