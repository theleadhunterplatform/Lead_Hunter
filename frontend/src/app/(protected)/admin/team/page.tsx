"use client";

import { useEffect, useState } from "react";
import { Users, UserPlus, Loader2, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { Button, Input } from "@/components/ui/HunterUI";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ADMIN_ROUTES } from "@/lib/routes";

export default function TeamPage() {
  const router = useRouter();
  const { user, hasPermission, permissions, loading: authLoading } = useAuth();
  const isPlatformAdmin = permissions.has("*");
  const canInviteOrgMembers = Boolean(user?.organization) && hasPermission("user:create");
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", email: "", password: "" });
  const [addingLoading, setAddingLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchMembers = async () => {
    try {
      const { data } = await api.get("/auth/organization/users");
      setMembers(data.data || data);
    } catch (err) {
      console.error("Failed to fetch members", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!hasPermission("user:read")) {
        router.push(ADMIN_ROUTES.dashboard);
        return;
      }
      fetchMembers();
    }
  }, [authLoading, hasPermission, router]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingLoading(true);
    setError("");

    try {
      let response;
      if (user?.organization) {
        response = await api.post("/auth/organization/users", newMember);
      } else {
        response = await api.post("/crm/team/invite", newMember);
      }
      setIsAdding(false);
      setNewMember({ name: "", email: "", password: "" });
      fetchMembers();
      const msg = response.data?.message;
      const tempPassword = response.data?.data?.temp_password;
      if (tempPassword) {
        toast.success(`Member created. Temporary password: ${tempPassword}`, { duration: 15000 });
      } else if (msg) {
        toast.success(msg);
      } else {
        toast.success("Team member added successfully!");
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      const errorMessage =
        errorData?.error ||
        errorData?.message ||
        err.message ||
        "Failed to add member. Please try again.";
      setError(typeof errorMessage === "string" ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setAddingLoading(false);
    }
  };

  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const handleToggleAccess = async (memberId: string, currentStatus: boolean) => {
    setToggleLoading(memberId);
    try {
      await api.put(`/auth/organization/users/${memberId}/access`, {
        lead_access_enabled: !currentStatus,
      });
      fetchMembers();
      toast.success("Lead access updated.");
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Failed to toggle access.");
    } finally {
      setToggleLoading(null);
    }
  };

  const handleDeleteMember = async (member: { _id?: string; id?: string; name: string }) => {
    const memberId = member._id || member.id;
    if (!memberId) {
      toast.error("Cannot deactivate user: missing user id.");
      return;
    }

    if (!window.confirm(`Deactivate ${member.name}? They will lose access and their role assignments will be removed.`)) return;

    setDeleteLoading(memberId);
    try {
      await api.delete(`/auth/organization/users/${memberId}`);
      fetchMembers();
      toast.success("User deactivated and access revoked.");
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to deactivate user.";
      toast.error(msg);
    } finally {
      setDeleteLoading(null);
    }
  };

  if (authLoading) return null;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-display font-black text-4xl uppercase tracking-tighter flex items-center gap-3">
            <Users className="text-hunter-orange" size={32} />
            Team <span className="text-hunter-orange">Members</span>
          </h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mt-2">
            {isPlatformAdmin
              ? "Platform view — all users. Assign roles in RBAC Engine."
              : "Manage your team members and their lead access."}
          </p>
        </div>

        {canInviteOrgMembers ? (
          <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2">
            <UserPlus size={18} />
            Add Team Member
          </Button>
        ) : isPlatformAdmin ? (
          <Link href={ADMIN_ROUTES.rbac}>
            <Button variant="secondary" className="flex items-center gap-2">
              <UserPlus size={18} />
              Manage in RBAC
            </Button>
          </Link>
        ) : null}
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-12 h-12 text-hunter-orange animate-spin" />
          <p className="font-display font-bold uppercase tracking-widest text-xs text-zinc-500">
            Loading...
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {members.length === 0 ? (
            <div className="bg-hunter-grey p-12 neo-border border-zinc-800 flex flex-col items-center text-center">
              <Users className="text-zinc-700 w-16 h-16 mb-4" />
              <h3 className="font-display font-black text-2xl uppercase tracking-tighter">
                No Team Members Found
              </h3>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mt-2 max-w-xs">
                {isPlatformAdmin
                  ? "No users in the system yet. Use RBAC Engine to assign roles."
                  : "Your team is currently empty. Start adding members to grow your business."}
              </p>
            </div>
          ) : (
            members.map((member, idx) => {
              const memberId = member._id || member.id;
              const isSelf = memberId === user?._id || memberId === (user as { id?: string })?.id;

              return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={memberId}
                className="bg-hunter-grey p-6 neo-border border-zinc-800 flex items-center justify-between group hover:border-hunter-orange transition-colors"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-hunter-black neo-border border-zinc-800 flex items-center justify-center">
                    <span className="font-display font-black text-xl text-hunter-orange">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display font-black text-xl uppercase tracking-tighter group-hover:text-hunter-orange transition-colors">
                      {member.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                        <Mail size={12} className="text-hunter-orange" /> {member.email}
                      </span>
                      <span className="flex items-center gap-1 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                        <ShieldCheck size={12} className="text-hunter-orange" />
                        {member.roles && member.roles.length > 0
                          ? typeof member.roles[0] === "string"
                            ? member.roles[0]
                            : member.roles[0]?.name || "Member"
                          : "Member"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      Lead Access
                    </span>
                    <button
                      disabled={toggleLoading === memberId || isSelf}
                      onClick={() =>
                        handleToggleAccess(memberId, member.lead_access_enabled !== false)
                      }
                      className={`w-10 h-5 neo-border transition-all relative ${
                        member.lead_access_enabled !== false
                          ? "bg-hunter-orange"
                          : "bg-zinc-800 opacity-50"
                      } ${toggleLoading === memberId ? "animate-pulse" : ""}`}
                    >
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white neo-border transition-all ${
                          member.lead_access_enabled !== false ? "right-0.5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {!isSelf && (
                    <button
                      type="button"
                      disabled={deleteLoading === memberId}
                      onClick={() => handleDeleteMember(member)}
                      className="p-2 text-zinc-500 hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Deactivate user"
                    >
                      {deleteLoading === memberId ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
              );
            })
          )}
        </div>
      )}

      <AnimatePresence>
        {isAdding && canInviteOrgMembers && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-hunter-black w-full max-w-md neo-border-orange overflow-hidden"
            >
              <div className="bg-hunter-orange p-6 flex justify-between items-center">
                <h2 className="text-black font-display font-black text-2xl uppercase tracking-tighter">
                  Add Team Member
                </h2>
                <button
                  onClick={() => setIsAdding(false)}
                  className="text-black hover:scale-110 transition-transform"
                >
                  <Trash2 size={24} className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleAddMember} className="p-8 space-y-6">
                {error && (
                  <div className="bg-red-500/10 border-2 border-red-500 p-4 text-red-500 text-xs font-black uppercase tracking-wider">
                    {error}
                  </div>
                )}

                <Input
                  label="Name"
                  placeholder="Enter name"
                  required
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                />

                <Input
                  label="Email"
                  placeholder="email@example.com"
                  type="email"
                  required
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                />

                <Input
                  label="Password (optional)"
                  placeholder="Auto-generated & emailed if empty"
                  type="password"
                  value={newMember.password}
                  onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                />
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest -mt-2">
                  Leave blank to email a secure temporary password
                </p>

                <div className="flex gap-4 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setIsAdding(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={addingLoading}>
                    {addingLoading ? <Loader2 className="animate-spin mx-auto" /> : "Add Member"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
