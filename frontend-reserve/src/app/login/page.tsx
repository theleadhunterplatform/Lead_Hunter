"use client";

import { useState, Suspense } from "react";
import { motion } from "framer-motion";
import { LogIn, ArrowLeft, Loader2, Phone, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, cn } from "@/components/ui/HunterUI";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_ROUTES } from "@/lib/routes";
import { getApiError } from "@/lib/errors";
import {
  getSupabaseBrowserClient,
  isSupabaseAuthConfigured,
  normalizePhoneInput,
} from "@/lib/supabase";

type AuthMode = "phone" | "email";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const phoneAuthEnabled = isSupabaseAuthConfigured();
  const [mode, setMode] = useState<AuthMode>(phoneAuthEnabled ? "phone" : "email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [formData, setFormData] = useState({ email: "", password: "" });

  const pendingFromQuery =
    searchParams.get("pending") === "approval"
      ? searchParams.get("message") || "Your account is pending admin approval."
      : null;
  const [pendingBanner, setPendingBanner] = useState<string | null>(pendingFromQuery);

  const isApprovalRelatedError = (message: string) =>
    /pending admin approval|awaiting admin approval|signup was rejected|account signup was rejected/i.test(
      message
    );

  const finishLogin = async (payload: any) => {
    if (payload.approval_required) {
      const message =
        payload.message || "Your account is pending admin approval.";
      setPendingBanner(message);
      setError("");
      router.replace(
        `/login?pending=approval&message=${encodeURIComponent(message)}`
      );
      return;
    }

    localStorage.setItem("hunter_token", payload.access_token);
    localStorage.setItem("hunter_refresh_token", payload.refresh_token);
    localStorage.setItem("hunter_user", JSON.stringify(payload.user));
    await refreshUser();

    if (payload.user?.must_change_password) {
      router.push("/change-password");
      return;
    }

    const redirect = searchParams.get("redirect");
    const destination =
      redirect === ADMIN_ROUTES.root || redirect?.startsWith(`${ADMIN_ROUTES.root}/`)
        ? redirect
        : "/dashboard";
    router.push(destination);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/auth/login", formData);
      await finishLogin(data.data || data);
    } catch (err: unknown) {
      const message = getApiError(err, "Login failed. Check your email and password.");
      if (isApprovalRelatedError(message)) {
        setPendingBanner(message);
        setError("");
        router.replace(
          `/login?pending=approval&message=${encodeURIComponent(message)}`
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const normalized = normalizePhoneInput(phone);
      if (!normalized || normalized.length < 10) {
        throw new Error("Enter a valid phone number with country code");
      }

      const supabase = getSupabaseBrowserClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalized });
      if (otpError) throw otpError;

      setPhone(normalized);
      setOtpSent(true);
    } catch (err: unknown) {
      setError(getApiError(err, "Could not send OTP. Check the number and try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: otpData, error: verifyError } = await supabase.auth.verifyOtp({
        phone: normalizePhoneInput(phone),
        token: otp.trim(),
        type: "sms",
      });
      if (verifyError) throw verifyError;

      const accessToken = otpData.session?.access_token;
      if (!accessToken) {
        throw new Error("Supabase did not return a session. Try again.");
      }

      const { data } = await api.post("/auth/supabase", { access_token: accessToken });
      await finishLogin(data.data || data);
    } catch (err: unknown) {
      const message = getApiError(err, "Invalid OTP or login failed.");
      if (isApprovalRelatedError(message)) {
        setPendingBanner(message);
        setError("");
        router.replace(
          `/login?pending=approval&message=${encodeURIComponent(message)}`
        );
      } else {
        setError(message);
      }
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
            {phoneAuthEnabled ? "Phone OTP or email — pick your way in" : "Sign in with your email"}
          </p>
        </div>

        {phoneAuthEnabled && (
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("phone");
                setError("");
              }}
              className={cn(
                "flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest neo-border-sm transition-all",
                mode === "phone"
                  ? "bg-hunter-orange text-black border-black"
                  : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600"
              )}
            >
              <Phone size={14} /> Phone OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("email");
                setError("");
                setOtpSent(false);
              }}
              className={cn(
                "flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest neo-border-sm transition-all",
                mode === "email"
                  ? "bg-hunter-orange text-black border-black"
                  : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600"
              )}
            >
              <Mail size={14} /> Email
            </button>
          </div>
        )}

        {process.env.NODE_ENV === "development" && mode === "email" && (
          <div className="mb-6 p-4 bg-hunter-orange/10 border-2 border-hunter-orange/40 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-hunter-orange mb-2">
              Dev Admin Login
            </p>
            <p className="text-xs text-zinc-300 font-mono">
              {process.env.NEXT_PUBLIC_DEV_ADMIN_EMAIL || "admin@leadhunter.com"}
            </p>
            <p className="text-xs text-zinc-300 font-mono mt-1">
              {process.env.NEXT_PUBLIC_DEV_ADMIN_PASSWORD || "Admin@12345"}
            </p>
          </div>
        )}

        <div className="space-y-6 bg-hunter-grey p-8 neo-border border-zinc-800">
          {pendingBanner && (
            <div className="bg-emerald-500/10 border-2 border-emerald-500 p-4 text-emerald-400 text-xs font-black uppercase tracking-wider">
              {pendingBanner}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border-2 border-red-500 p-4 text-red-500 text-xs font-black uppercase tracking-wider">
              {error}
            </div>
          )}

          {mode === "phone" && phoneAuthEnabled ? (
            <form
              onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}
              className="space-y-6"
            >
              <Input
                label="Phone Number"
                placeholder="+91 98765 43210"
                type="tel"
                required
                value={phone}
                disabled={otpSent || loading}
                onChange={(e) => setPhone(e.target.value)}
              />

              {otpSent && (
                <Input
                  label="OTP Code"
                  placeholder="6-digit code"
                  type="text"
                  inputMode="numeric"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              )}

              <Button type="submit" className="w-full text-xl py-4" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <Loader2 className="animate-spin" />
                    {otpSent ? "Verifying..." : "Sending OTP..."}
                  </span>
                ) : otpSent ? (
                  "Verify & Sign In"
                ) : (
                  "Send OTP"
                )}
              </Button>

              {otpSent && (
                <button
                  type="button"
                  className="w-full text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-hunter-orange"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                    setError("");
                  }}
                >
                  Change number
                </button>
              )}
            </form>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              {!phoneAuthEnabled && (
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  Phone OTP needs Supabase env keys. Using email login for now.
                </p>
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

              <p className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-[10px] font-bold uppercase tracking-widest text-hunter-orange hover:underline"
                >
                  Forgot password?
                </Link>
              </p>

              <Button type="submit" className="w-full text-xl py-4" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <Loader2 className="animate-spin" /> Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          )}

          <p className="text-center text-zinc-500 text-xs font-bold uppercase tracking-widest pt-4">
            No account?{" "}
            <Link href="/register" className="text-hunter-orange hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-hunter-orange animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
