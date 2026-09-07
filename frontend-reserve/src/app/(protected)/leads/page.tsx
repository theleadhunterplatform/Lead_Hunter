"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_ROUTES } from "@/lib/routes";

export default function LeadsRedirectPage() {
  const router = useRouter();
  const { permissions, loading } = useAuth();
  const isInternal = permissions.has('*');

  useEffect(() => {
    if (loading) return;
    router.replace(isInternal ? ADMIN_ROUTES.leadIntelligence : "/leads/relevant");
  }, [loading, isInternal, router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-hunter-orange animate-spin" />
    </div>
  );
}
