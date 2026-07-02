"use client";

import { useState, Suspense } from "react";
import { motion } from "framer-motion";
import { KeyRound, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui/HunterUI";
import api from "@/lib/api";
import { toast } from "sonner";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Invalid reset link");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Password updated — sign in with your new password");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <Link href="/login" className="absolute top-8 left-8 flex items-center gap-2 font-display font-bold uppercase text-sm hover:text-hunter-orange transition-colors">
        <ArrowLeft size={18} /> Back to Sign In
      </Link>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <div className="p-3 bg-hunter-orange neo-border rounded-sm mb-4">
            <KeyRound className="text-black w-8 h-8" />
          </div>
          <h1 className="font-display font-black text-4xl uppercase tracking-tighter text-center">
            New <span className="text-hunter-orange">Password</span>
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-hunter-grey p-8 neo-border border-zinc-800">
          <Input label="New Password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" className="w-full" disabled={loading || !token}>
            {loading ? <Loader2 className="animate-spin mx-auto" /> : "Update Password"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-hunter-orange" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
