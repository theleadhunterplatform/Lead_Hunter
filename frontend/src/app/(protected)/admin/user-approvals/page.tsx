"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Shield, UserX, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button, Input } from "@/components/ui/HunterUI";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_ROUTES } from "@/lib/routes";

type PendingUser = {
  id: string;
  name: string;
  email: string;
  status: string;
  plan: string;
  created_at: string;
  organization: { id: string; name: string } | null;
};

export default function UserApprovalsPage() {
  const router = useRouter();
  const { loading: authLoading, permissions } = useAuth();
  const isPlatformAdmin = permissions.has("*") || permissions.has("system:admin");

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/users/pending");
      setUsers(data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to fetch pending users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isPlatformAdmin) {
      router.replace(ADMIN_ROUTES.dashboard);
      return;
    }
    if (!authLoading && isPlatformAdmin) {
      fetchPendingUsers();
    }
  }, [authLoading, isPlatformAdmin, router]);

  const approveUser = async (userId: string) => {
    try {
      setBusyId(userId);
      await api.post(`/admin/users/${userId}/approve`);
      toast.success("User approved.");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to approve user.");
    } finally {
      setBusyId(null);
    }
  };

  const rejectUser = async () => {
    if (!rejectingId) return;
    try {
      setBusyId(rejectingId);
      await api.post(`/admin/users/${rejectingId}/reject`, {
        reason: rejectReason.trim() || undefined,
      });
      toast.success("User rejected.");
      setUsers((prev) => prev.filter((u) => u.id !== rejectingId));
      setRejectingId(null);
      setRejectReason("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to reject user.");
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="p-10 flex items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="animate-spin" />
        <span className="font-bold uppercase tracking-wider text-xs">Loading approvals...</span>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display font-black text-4xl uppercase tracking-tighter flex items-center gap-3">
          <Shield className="text-hunter-orange" size={30} />
          User <span className="text-hunter-orange">Approvals</span>
        </h1>
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mt-2">
          Approve or reject new signups waiting for platform access.
        </p>
      </div>

      {users.length === 0 ? (
        <div className="bg-hunter-grey neo-border border-zinc-800 p-10 text-center">
          <p className="text-zinc-400 font-black uppercase tracking-wider text-xs">
            No pending users right now.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((u) => {
            const isBusy = busyId === u.id;
            return (
              <div
                key={u.id}
                className="bg-hunter-grey neo-border border-zinc-800 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div>
                  <h3 className="font-display font-black text-xl uppercase tracking-tight">{u.name}</h3>
                  <p className="text-zinc-400 text-xs font-bold mt-1">{u.email}</p>
                  <p className="text-zinc-500 text-[10px] mt-2 font-bold uppercase tracking-wider">
                    Plan: {u.plan} {u.organization ? `| Org: ${u.organization.name}` : ""}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    className="flex items-center gap-2"
                    disabled={isBusy}
                    onClick={() => approveUser(u.id)}
                  >
                    {isBusy ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={isBusy}
                    onClick={() => setRejectingId(u.id)}
                  >
                    <UserX size={14} />
                    Reject
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rejectingId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
          <div className="bg-hunter-black neo-border-orange w-full max-w-lg">
            <div className="bg-hunter-orange p-5 flex items-center justify-between">
              <h2 className="font-display font-black text-2xl uppercase text-black">Reject User</h2>
              <button
                onClick={() => {
                  setRejectingId(null);
                  setRejectReason("");
                }}
                className="text-black"
              >
                <X />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Input
                label="Reason (optional)"
                placeholder="Reason for rejection"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setRejectingId(null);
                    setRejectReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={rejectUser}
                  disabled={busyId === rejectingId}
                >
                  {busyId === rejectingId ? <Loader2 className="animate-spin mx-auto" /> : "Confirm Reject"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
