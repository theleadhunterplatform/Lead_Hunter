import { CheckCircle2, ShieldAlert } from "lucide-react";

export type ApiUsageStatus = "active" | "low" | "exhausted" | "not_configured";

export type UsageMetric = {
  label: string;
  used: number | null;
  limit: number | null;
  remaining: number | null;
};

export type ApiUsageData = {
  status?: ApiUsageStatus;
  exhausted?: boolean;
  rate_limited?: boolean;
  used?: number | null;
  limit?: number | null;
  remaining?: number | null;
  secondary_used?: number | null;
  secondary_limit?: number | null;
  secondary_remaining?: number | null;
  secondary_label?: string;
  plan_name?: string | null;
  reset_date?: string | null;
  extra_note?: string | null;
  usage_label?: string;
};

function statusBadgeLabel(status: ApiUsageStatus, rateLimited?: boolean): string {
  if (status === "exhausted") return rateLimited ? "Limit Reached" : "Exhausted";
  if (status === "low") return "Low Quota";
  if (status === "active") return "Active";
  return "Not Configured";
}

function statusStyles(status: ApiUsageStatus): {
  iconWrap: string;
  badge: string;
  icon: "alert" | "ok";
} {
  if (status === "exhausted") {
    return {
      iconWrap: "bg-red-500/10 border-red-500/30",
      badge: "bg-red-500 text-white border-red-700",
      icon: "alert",
    };
  }
  if (status === "low") {
    return {
      iconWrap: "bg-hunter-orange/10 border-hunter-orange/30",
      badge: "bg-hunter-orange text-black",
      icon: "ok",
    };
  }
  return {
    iconWrap: "bg-green-500/10 border-green-500/30",
    badge: "bg-green-500 text-black",
    icon: "ok",
  };
}

function progressColor(used: number, limit: number, remaining: number): string {
  const usagePct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  if (usagePct >= 95 || remaining === 0) return "bg-red-500";
  if (usagePct >= 80) return "bg-hunter-orange";
  return "bg-green-500";
}

function UsageBar({ metric }: { metric: UsageMetric }) {
  if (metric.limit == null || metric.used == null) return null;

  const limit = metric.limit;
  const used = metric.used;
  const remaining = metric.remaining ?? Math.max(0, limit - used);
  const usagePct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const color = progressColor(used, limit, remaining);

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
          {metric.label}: <span className="text-white">{used}</span> / {limit}
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          {remaining} left
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full max-w-xs bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${usagePct}%` }} />
      </div>
    </div>
  );
}

type ApiUsagePanelProps = {
  title: string;
  maskedCredential?: string | null;
  configured: boolean;
  usage?: ApiUsageData | null;
  primary?: UsageMetric;
  secondary?: UsageMetric;
  extraInline?: React.ReactNode;
  notConfiguredMessage: string;
};

export function ApiUsagePanel({
  title,
  maskedCredential,
  configured,
  usage,
  primary,
  secondary,
  extraInline,
  notConfiguredMessage,
}: ApiUsagePanelProps) {
  if (!configured) {
    return (
      <div className="mb-6 p-4 bg-red-500/5 neo-border border-red-500/20 flex items-center gap-3">
        <ShieldAlert className="text-red-500 shrink-0" size={20} />
        <p className="text-red-500/70 text-[10px] font-black uppercase tracking-widest">{notConfiguredMessage}</p>
      </div>
    );
  }

  const status: ApiUsageStatus = usage?.status ?? "active";
  const styles = statusStyles(status);
  const primaryMetric: UsageMetric | null =
    primary ??
    (usage?.limit != null
      ? {
          label: usage.usage_label ?? "Usage",
          used: usage.used ?? 0,
          limit: usage.limit,
          remaining: usage.remaining ?? null,
        }
      : null);
  const secondaryMetric: UsageMetric | null =
    secondary ??
    (usage?.secondary_limit != null
      ? {
          label: usage.secondary_label ?? "Secondary",
          used: usage.secondary_used ?? 0,
          limit: usage.secondary_limit,
          remaining: usage.secondary_remaining ?? null,
        }
      : null);

  return (
    <div className="mb-6 p-4 bg-zinc-900/50 neo-border border-zinc-800">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-10 h-10 flex items-center justify-center neo-border shrink-0 ${styles.iconWrap}`}>
            {styles.icon === "alert" ? (
              <ShieldAlert size={20} className="text-red-500" />
            ) : (
              <CheckCircle2 size={20} className={status === "low" ? "text-hunter-orange" : "text-green-500"} />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-lg uppercase tracking-tight">{title}</div>
            {maskedCredential && <div className="text-zinc-600 font-mono text-xs truncate">{maskedCredential}</div>}
            {usage?.plan_name && (
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                Plan: {usage.plan_name}
                {usage.reset_date ? ` · resets ${usage.reset_date}` : ""}
              </div>
            )}
          </div>
        </div>
        <div className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest neo-border border-black shrink-0 ${styles.badge}`}>
          {statusBadgeLabel(status, usage?.rate_limited)}
        </div>
      </div>

      {primaryMetric && primaryMetric.limit != null && <UsageBar metric={primaryMetric} />}
      {!primaryMetric?.limit && usage?.remaining != null && (
        <div className="mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            {usage.usage_label ?? "Credits"} remaining:{" "}
            <span className="text-white">{usage.remaining}</span>
          </span>
        </div>
      )}
      {secondaryMetric && secondaryMetric.limit != null && secondaryMetric.limit > 0 && (
        <UsageBar metric={secondaryMetric} />
      )}
      {extraInline}
      {(usage?.exhausted || usage?.rate_limited || usage?.extra_note) && (
        <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-red-400/80">
          {usage.extra_note ??
            (usage.rate_limited
              ? "API quota exhausted or rate limited — lookups skipped until reset."
              : "Quota exhausted — lookups skipped until reset.")}
        </p>
      )}
    </div>
  );
}
