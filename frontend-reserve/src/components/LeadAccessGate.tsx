"use client";

import { ShieldOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/**
 * Blocks hunter lead surfaces when an org manager disabled lead access.
 * Platform admins (`*`) always pass.
 */
export function LeadAccessGate({ children }: { children: React.ReactNode }) {
  const { user, permissions, loading } = useAuth();

  if (loading) return null;

  const isPlatformAdmin = permissions.has("*");
  if (!isPlatformAdmin && user?.lead_access_enabled === false) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto w-14 h-14 bg-zinc-900 neo-border border-zinc-800 flex items-center justify-center">
            <ShieldOff className="text-zinc-500" size={28} />
          </div>
          <h2 className="font-display font-black uppercase text-2xl tracking-tight">
            Lead access restricted
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Your manager has disabled hunting for this account. Contact your organization admin if you need access restored.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
