"use client";

import { useState, Suspense } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui/HunterUI";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

function RegisterForm() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    organization_name: "",
  });
  const [isOrganization, setIsOrganization] = useState(searchParams.get("org") === "true");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setError("You must accept the Terms of Service and Privacy Policy.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const payload_data = {
        ...formData,
        organization_name: isOrganization ? formData.organization_name : undefined,
        referred_by: searchParams.get("ref") || undefined
      };
      const { data } = await api.post("/auth/register", payload_data);
      const payload = data.data || data;

      if (payload.approval_required) {
        router.push(
          `/login?pending=approval&message=${encodeURIComponent(
            payload.message || "Account created. Awaiting admin approval before you can log in."
          )}`
        );
        return;
      }

      if (!payload.access_token || !payload.refresh_token) {
        setError("Registration succeeded but sign-in could not be completed. Please try logging in.");
        return;
      }

      localStorage.setItem("hunter_token", payload.access_token);
      localStorage.setItem("hunter_refresh_token", payload.refresh_token);
      localStorage.setItem("hunter_user", JSON.stringify(payload.user));
      await refreshUser();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "Registration failed. Please try again.");
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
            <ShieldCheck className="text-black w-8 h-8" />
          </div>
          <h1 className="font-display font-black text-4xl uppercase tracking-tighter text-center">
            Create <span className="text-hunter-orange">Account</span>
          </h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mt-2 text-center">
            Start finding leads for your business today.
          </p>
          <p className="text-zinc-400 text-xs mt-3 text-center max-w-sm leading-relaxed">
            New accounts usually need admin approval before you can sign in. You&apos;ll get access as soon as a platform admin approves you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-hunter-grey p-8 neo-border border-zinc-800">
          {error && (
            <div className="bg-red-500/10 border-2 border-red-500 p-4 text-red-500 text-xs font-black uppercase tracking-wider">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-hunter-black/50 border border-zinc-800 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Is this for a business team?</span>
            <button
              type="button"
              onClick={() => setIsOrganization(!isOrganization)}
              className={`w-12 h-6 neo-border transition-colors relative ${isOrganization ? 'bg-hunter-orange' : 'bg-zinc-800'}`}
            >
              <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white neo-border transition-all ${isOrganization ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          {isOrganization && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden pb-2"
            >
              <Input
                label="Business Name"
                placeholder="Enter your business name"
                required={isOrganization}
                value={formData.organization_name}
                onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
              />
            </motion.div>
          )}

          <Input
            label="Your Name"
            placeholder="Your name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Input
            label="Your Email"
            placeholder="email@example.com"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <Input
            label="Create Password"
            placeholder="••••••••"
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 accent-hunter-orange"
            />
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide leading-relaxed">
              I agree to the{" "}
              <Link href="/terms" className="text-hunter-orange hover:underline" target="_blank">Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-hunter-orange hover:underline" target="_blank">Privacy Policy</Link>
            </span>
          </label>

          <Button
            type="submit"
            className="w-full text-xl py-4 mt-4"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="animate-spin" /> Starting...
              </span>
            ) : (
              "Get Started"
            )}
          </Button>

          <p className="text-center text-zinc-500 text-xs font-bold uppercase tracking-widest pt-4">
            Already have an account? <Link href="/login" className="text-hunter-orange hover:underline">Sign In</Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-hunter-black">
        <Loader2 className="w-12 h-12 text-hunter-orange animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
