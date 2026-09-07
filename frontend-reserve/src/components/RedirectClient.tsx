"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function RedirectClient({ to }: { to: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-hunter-black">
      <Loader2 className="w-8 h-8 text-hunter-orange animate-spin" />
    </div>
  );
}
