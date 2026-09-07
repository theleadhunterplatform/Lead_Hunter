"use client";

import { useState, Suspense } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button, Input } from "@/components/ui/HunterUI";
import api from "@/lib/api";
import { toast } from "sonner";

function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDevResetUrl(null);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      const emailConfigured = data.email_configured !== false;
      const message =
        data.message ||
        (emailConfigured
          ? "If that email exists, a reset link has been sent."
          : "Password reset is temporarily unavailable.");

      setStatusMessage(message);

      if (!emailConfigured) {
        setUnavailable(true);
        setSent(false);
        if (data.reset_url) setDevResetUrl(data.reset_url);
        toast.error(message);
        return;
      }

      setUnavailable(false);
      setSent(true);
      toast.success("Check your email for reset instructions");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Could not send reset email");
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
            <Mail className="text-black w-8 h-8" />
          </div>
          <h1 className="font-display font-black text-4xl uppercase tracking-tighter text-center">
            Reset <span className="text-hunter-orange">Password</span>
          </h1>
        </div>

        {unavailable ? (
          <div className="bg-hunter-grey p-8 neo-border border-zinc-800 text-center space-y-4">
            <p className="text-zinc-300 text-sm">{statusMessage}</p>
            {devResetUrl && (
              <a
                href={devResetUrl}
                className="block text-hunter-orange font-bold uppercase text-xs tracking-widest hover:underline break-all"
              >
                Open reset link (dev)
              </a>
            )}
            <Link href="/login" className="text-hunter-orange font-bold uppercase text-xs tracking-widest hover:underline">
              Return to sign in
            </Link>
          </div>
        ) : sent ? (
          <div className="bg-hunter-grey p-8 neo-border border-zinc-800 text-center space-y-4">
            <p className="text-zinc-300 text-sm">If an account exists for that email, we sent a reset link.</p>
            <Link href="/login" className="text-hunter-orange font-bold uppercase text-xs tracking-widest hover:underline">Return to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 bg-hunter-grey p-8 neo-border border-zinc-800">
            <Input label="Your Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "Send Reset Link"}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-hunter-orange" /></div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
