"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/HunterUI";
import { cn } from "@/components/ui/HunterUI";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getApiError } from "@/lib/errors";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { toast } from "sonner";

type PlanCard = {
  id: string;
  name: string;
  description: string;
  monthly_tokens: number;
  max_claims_per_month: number;
  features: string[];
  amount_paise?: number;
  price_paise?: number;
  currency?: string;
};

type MyPlan = {
  plan: string;
  plan_name: string;
  tokens: number;
  monthly_tokens: number;
  claims_this_month: number;
  max_claims_per_month: number;
  claims_remaining_this_month: number | null;
};

function formatInr(paise?: number) {
  if (!paise && paise !== 0) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export default function BillingPage() {
  const { user, refreshUser } = useAuth();
  const [myPlan, setMyPlan] = useState<MyPlan | null>(null);
  const [catalog, setCatalog] = useState<PlanCard[]>([]);
  const [paymentsConfigured, setPaymentsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payingPlan, setPayingPlan] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [meRes, payRes, allRes] = await Promise.all([
        api.get("/plans/me").catch(() => null),
        api.get("/payments/plans").catch(() => null),
        api.get("/plans").catch(() => null),
      ]);

      if (meRes?.data?.data) setMyPlan(meRes.data.data);

      const configured = payRes?.data?.configured === true;
      setPaymentsConfigured(configured);

      const paidPlans: PlanCard[] = payRes?.data?.data || [];
      if (paidPlans.length > 0) {
        setCatalog(paidPlans);
      } else {
        const all: PlanCard[] = allRes?.data?.data || [];
        setCatalog(all.filter((p) => p.id !== "free"));
      }
    } catch (error: unknown) {
      toast.error(getApiError(error, "Failed to load plans"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpgrade = async (planId: string) => {
    if (!paymentsConfigured) {
      toast.error("Online upgrades are not available yet. Contact your admin.");
      return;
    }
    try {
      setPayingPlan(planId);
      const { data } = await api.post("/payments/razorpay/order", { plan: planId });
      const order = data.data;

      await openRazorpayCheckout({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || "INR",
        name: order.name || "Lead Hunter",
        description: order.description,
        order_id: order.order_id,
        prefill: order.prefill,
        theme: { color: "#F97316" },
        handler: async (response) => {
          try {
            const verify = await api.post("/payments/razorpay/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success(verify.data.message || "Plan upgraded");
            await refreshUser();
            await load();
          } catch (error: unknown) {
            toast.error(getApiError(error, "Payment verification failed"));
          } finally {
            setPayingPlan(null);
          }
        },
        modal: {
          ondismiss: () => setPayingPlan(null),
        },
      });
    } catch (error: unknown) {
      toast.error(getApiError(error, "Could not start checkout"));
      setPayingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center py-40">
        <Loader2 className="w-10 h-10 text-hunter-orange animate-spin" />
      </div>
    );
  }

  if (!paymentsConfigured) {
    return (
      <div className="p-8 max-w-2xl mx-auto py-24 text-center space-y-4">
        <h1 className="text-3xl font-display font-black uppercase tracking-tighter">
          Billing <span className="text-hunter-orange">offline.</span>
        </h1>
        <p className="text-zinc-500 text-sm">
          Self-serve upgrades are not available yet. You can keep using your current plan tokens.
        </p>
        <Button onClick={() => (window.location.href = "/dashboard")} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const currentPlan = myPlan?.plan || user?.plan || "free";

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-12">
        <h1 className="text-5xl font-display font-black uppercase tracking-tighter mb-2 italic">
          Plan <span className="text-hunter-orange underline">Billing.</span>
        </h1>
        <p className="text-zinc-500 font-display font-bold uppercase text-[10px] tracking-widest">
          Upgrade with Razorpay — tokens refill with your plan
        </p>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 bg-hunter-grey neo-border border-zinc-800 p-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">
              Current plan
            </p>
            <h2 className="text-2xl font-display font-black uppercase tracking-tight">
              {myPlan?.plan_name || currentPlan}
            </h2>
            <p className="text-[11px] text-zinc-400 mt-2 font-medium">
              {myPlan?.tokens ?? user?.tokens ?? 0} tokens ·{" "}
              {myPlan?.claims_this_month ?? 0}
              {myPlan?.max_claims_per_month != null && myPlan.max_claims_per_month >= 0
                ? ` / ${myPlan.max_claims_per_month}`
                : ""}{" "}
              claims this month
            </p>
          </div>
          <div className="px-3 py-1.5 bg-hunter-orange/15 border border-hunter-orange/40 text-hunter-orange text-[9px] font-black uppercase tracking-widest">
            Active
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {catalog.map((plan) => {
          const amount = plan.amount_paise ?? plan.price_paise;
          const isCurrent = plan.id === currentPlan;
          const isPaying = payingPlan === plan.id;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "bg-hunter-grey neo-border p-6 flex flex-col",
                isCurrent ? "border-hunter-orange" : "border-zinc-800"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display font-black uppercase text-xl tracking-tight">
                    {plan.name}
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-1">{plan.description}</p>
                </div>
                <CreditCard className="text-zinc-600" size={20} />
              </div>

              <p className="text-3xl font-display font-black tracking-tighter mb-1">
                {formatInr(amount)}
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest ml-2">
                  / month
                </span>
              </p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6">
                {plan.monthly_tokens} tokens ·{" "}
                {plan.max_claims_per_month < 0
                  ? "Unlimited claims"
                  : `${plan.max_claims_per_month} claims / mo`}
              </p>

              <ul className="space-y-2 mb-8 flex-1">
                {(plan.features || []).map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-[11px] text-zinc-300 font-medium"
                  >
                    <Check size={14} className="text-hunter-orange shrink-0" />
                    {feature.replace(/_/g, " ")}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full h-11 text-[10px] font-black uppercase tracking-widest gap-2"
                disabled={isCurrent || Boolean(payingPlan) || !paymentsConfigured}
                isLoading={isPaying}
                onClick={() => handleUpgrade(plan.id)}
              >
                <Sparkles size={14} />
                {isCurrent
                  ? "Current Plan"
                  : paymentsConfigured
                    ? `Upgrade to ${plan.name}`
                    : "Checkout unavailable"}
              </Button>
            </motion.div>
          );
        })}
      </div>

      {catalog.length === 0 && (
        <p className="text-center text-zinc-500 text-xs font-bold uppercase tracking-widest py-16">
          No paid plans available. Check Razorpay env on the API.
        </p>
      )}
    </div>
  );
}
