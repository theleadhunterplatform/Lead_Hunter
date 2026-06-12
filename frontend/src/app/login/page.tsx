"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LogIn, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui/HunterUI";
import api from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/auth/login", formData);
      const payload = data.data || data;
      localStorage.setItem("hunter_token", payload.access_token);
      localStorage.setItem("hunter_refresh_token", payload.refresh_token);
      localStorage.setItem("hunter_user", JSON.stringify(payload.user));
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "Login failed. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center gap-2 font-display font-bold uppercase text-sm hover:text-hunter-orange transition-colors"
      >
        <ArrowLeft size={18} /> Back to Home
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="p-3 bg-hunter-orange neo-border rounded-sm mb-4">
            <LogIn className="text-black w-8 h-8" />
          </div>
          <h1 className="font-display font-black text-4xl uppercase tracking-tighter text-center">
            Sign <span className="text-hunter-orange">In</span>
          </h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mt-2">
            Welcome back. Sign in to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-hunter-grey p-8 neo-border border-zinc-800">
          {error && (
            <div className="bg-red-500/10 border-2 border-red-500 p-4 text-red-500 text-xs font-black uppercase tracking-wider">
              {error}
            </div>
          )}

          <Input
            label="Your Email"
            placeholder="email@example.com"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <Input
            label="Your Password"
            placeholder="••••••••"
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          <Button
            type="submit"
            className="w-full text-xl py-4"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="animate-spin" /> Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </Button>

          <p className="text-center text-zinc-500 text-xs font-bold uppercase tracking-widest pt-4">
            No account? <Link href="/register" className="text-hunter-orange hover:underline">Create an account</Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
