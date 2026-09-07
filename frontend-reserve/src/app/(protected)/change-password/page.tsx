"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui/HunterUI";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { refreshUser, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ current_password: "", new_password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/change-password", form);
      toast.success("Password updated");
      await refreshUser();
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Could not change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <div className="p-3 bg-hunter-orange neo-border rounded-sm mb-4">
            <ShieldCheck className="text-black w-8 h-8" />
          </div>
          <h1 className="font-display font-black text-3xl uppercase tracking-tighter text-center">
            Set Your <span className="text-hunter-orange">Password</span>
          </h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-2 text-center">
            {user?.email ? `Signed in as ${user.email}` : "Choose a secure password to continue"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-hunter-grey p-8 neo-border border-zinc-800">
          <Input
            label="Current / Temporary Password"
            type="password"
            required
            value={form.current_password}
            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
          />
          <Input
            label="New Password"
            type="password"
            required
            minLength={6}
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mx-auto" /> : "Save & Continue"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
