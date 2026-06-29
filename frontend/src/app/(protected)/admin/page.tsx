"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_ROUTES, hasAdminAreaAccess } from "@/lib/routes";

export default function AdminEntryPage() {
  const router = useRouter();
  const { user, loading, permissions, hasPermission } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(ADMIN_ROUTES.root)}`);
      return;
    }

    if (hasAdminAreaAccess(permissions, hasPermission)) {
      router.replace(ADMIN_ROUTES.dashboard);
      return;
    }

    router.replace("/dashboard");
  }, [loading, user, permissions, hasPermission, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-hunter-black">
      <Loader2 className="w-8 h-8 text-hunter-orange animate-spin" />
    </div>
  );
}
