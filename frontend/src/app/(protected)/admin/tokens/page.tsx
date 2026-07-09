"use client";

import { useState, useEffect } from "react";
import { Button as HunterButton, Input as HunterInput } from "@/components/ui/HunterUI";
import { Key, Plus, Trash2, ShieldCheck, ShieldAlert, Loader2, RefreshCw, Sparkles, Activity } from "lucide-react";
import api from "@/lib/api";
import { ApiUsagePanel, type ApiUsageData } from "@/components/ApiUsagePanel";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_ROUTES } from "@/lib/routes";

export default function TokensPage() {
  const router = useRouter();
  const { hasPermission, loading: authLoading } = useAuth();
  const [tokens, setTokens] = useState<{
    _id: string;
    key: string;
    label: string;
    is_active: boolean;
    assigned_worker?: string | null;
    comments_used?: number;
    comments_limit?: number;
    comments_remaining?: number;
    usage?: ApiUsageData;
    platform_usage?: ApiUsageData | null;
  }[]>([]);
  const [activeLeases, setActiveLeases] = useState<
    Array<{ worker_id: string; key_id: string; key_label: string | null }>
  >([]);
  const [newToken, setNewToken] = useState({ key: "", label: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Contact Compass State
  const [ccTokenInfo, setCCTokenInfo] = useState<{
    token: string | null;
    is_configured: boolean;
    lookups_used?: number;
    lookups_limit?: number;
    lookups_remaining?: number;
    credits_left?: number | null;
    remaining?: number | null;
    status?: ApiUsageData["status"];
    exhausted?: boolean;
    rate_limited?: boolean;
    extra_note?: string | null;
  }>({ token: null, is_configured: false });
  const [newCCToken, setNewCCToken] = useState("");
  const [isUpdatingCC, setIsUpdatingCC] = useState(false);

  const [hunterKeyInfo, setHunterKeyInfo] = useState<{
    api_key: string | null;
    is_configured: boolean;
    searches_used?: number | null;
    searches_limit?: number | null;
    searches_remaining?: number | null;
    verifications_used?: number | null;
    verifications_limit?: number | null;
    verifications_remaining?: number | null;
    plan_name?: string | null;
    reset_date?: string | null;
    exhausted?: boolean;
    rate_limited?: boolean;
    status?: 'active' | 'low' | 'exhausted' | 'not_configured';
  }>({ api_key: null, is_configured: false });
  const [newHunterKey, setNewHunterKey] = useState("");
  const [isUpdatingHunter, setIsUpdatingHunter] = useState(false);

  const [contactOutInfo, setContactOutInfo] = useState<{
    token: string | null;
    is_configured: boolean;
    status?: ApiUsageData["status"];
    exhausted?: boolean;
    rate_limited?: boolean;
    used?: number | null;
    limit?: number | null;
    remaining?: number | null;
    extra_note?: string | null;
  }>({ token: null, is_configured: false });
  const [newContactOutToken, setNewContactOutToken] = useState("");
  const [isUpdatingContactOut, setIsUpdatingContactOut] = useState(false);

  const [apolloKeyInfo, setApolloKeyInfo] = useState<{
    api_key: string | null;
    is_configured: boolean;
    status?: ApiUsageData["status"];
    exhausted?: boolean;
    rate_limited?: boolean;
    used?: number | null;
    limit?: number | null;
    remaining?: number | null;
    plan_name?: string | null;
    reset_date?: string | null;
    extra_note?: string | null;
  }>({ api_key: null, is_configured: false });
  const [newApolloKey, setNewApolloKey] = useState("");
  const [isUpdatingApollo, setIsUpdatingApollo] = useState(false);

  const [automation, setAutomation] = useState({
    auto_scrape_enabled: false,
    auto_enrichment_enabled: false,
    keep_alive_enabled: false,
    keep_alive_configured: false,
    scrape_interval_minutes: 30,
    keep_alive_interval_minutes: 10,
  });
  const [isUpdatingAutomation, setIsUpdatingAutomation] = useState(false);

  const fetchTokens = async () => {
    try {
      const response = await api.get("/apify-keys");
      setTokens(response.data.data);
      setActiveLeases(response.data.active_leases || []);
    } catch (error: any) {
      console.error("Failed to fetch tokens", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCCToken = async () => {
    try {
      const response = await api.get("/settings/contact-compass-token");
      setCCTokenInfo(response.data.data);
    } catch (err) {
      console.error("Failed to fetch CC token", err);
    }
  };

  const fetchHunterKey = async () => {
    try {
      const response = await api.get("/settings/hunter-api-key");
      setHunterKeyInfo(response.data.data);
    } catch (err) {
      console.error("Failed to fetch Hunter key", err);
    }
  };

  const fetchContactOutToken = async () => {
    try {
      const response = await api.get("/settings/contactout-api-token");
      setContactOutInfo(response.data.data);
    } catch (err) {
      console.error("Failed to fetch ContactOut token", err);
    }
  };

  const fetchApolloKey = async () => {
    try {
      const response = await api.get("/settings/apollo-api-key");
      setApolloKeyInfo(response.data.data);
    } catch (err) {
      console.error("Failed to fetch Apollo key", err);
    }
  };

  const fetchAutomation = async () => {
    try {
      const response = await api.get("/settings/automation");
      setAutomation(response.data.data);
    } catch (err) {
      console.error("Failed to fetch automation settings", err);
    }
  };

  const toggleAutomation = async (key: "auto_scrape_enabled" | "auto_enrichment_enabled" | "keep_alive_enabled") => {
    try {
      setIsUpdatingAutomation(true);
      const next = !automation[key];
      const response = await api.patch("/settings/automation", { [key]: next });
      setAutomation(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update automation settings.");
    } finally {
      setIsUpdatingAutomation(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!hasPermission('scraping:manage')) {
        router.push(ADMIN_ROUTES.dashboard);
        return;
      }
      fetchTokens();
      fetchCCToken();
      fetchHunterKey();
      fetchContactOutToken();
      fetchApolloKey();
      fetchAutomation();
    }
  }, [authLoading, hasPermission, router]);

  const addToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newToken.key.trim()) return;
    setError("");

    try {
      await api.post("/apify-keys", newToken);
      setNewToken({ key: "", label: "" });
      fetchTokens();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to add key.";
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      console.error("Failed to add token", err);
    }
  };

  const deleteToken = async (id: string) => {
    setError("");
    try {
      await api.delete(`/apify-keys/${id}`);
      fetchTokens();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to delete key.";
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      console.error("Failed to delete token", err);
    }
  };

  const updateCCToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCCToken.trim()) return;
    setIsUpdatingCC(true);
    try {
      await api.post("/settings/contact-compass-token", { token: newCCToken });
      setNewCCToken("");
      fetchCCToken();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update Lead Enrichment token.");
    } finally {
      setIsUpdatingCC(false);
    }
  };

  const updateHunterKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHunterKey.trim()) return;
    setIsUpdatingHunter(true);
    try {
      await api.post("/settings/hunter-api-key", { api_key: newHunterKey });
      setNewHunterKey("");
      fetchHunterKey();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update Hunter.io API key.");
    } finally {
      setIsUpdatingHunter(false);
    }
  };

  const updateContactOutToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactOutToken.trim()) return;
    setIsUpdatingContactOut(true);
    try {
      await api.post("/settings/contactout-api-token", { token: newContactOutToken });
      setNewContactOutToken("");
      fetchContactOutToken();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update ContactOut token.");
    } finally {
      setIsUpdatingContactOut(false);
    }
  };

  const updateApolloKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApolloKey.trim()) return;
    setIsUpdatingApollo(true);
    try {
      await api.post("/settings/apollo-api-key", { api_key: newApolloKey });
      setNewApolloKey("");
      fetchApolloKey();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update Apollo API key.");
    } finally {
      setIsUpdatingApollo(false);
    }
  };


  if (authLoading) return null;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-10">
        <h1 className="font-display font-black text-4xl uppercase tracking-tighter mb-2">
          Search <span className="text-hunter-orange">Keys</span>
        </h1>
        <p className="text-zinc-500 font-display uppercase text-xs tracking-widest">
          Add your API keys to enable automated lead searching.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border-2 border-red-500 p-4 text-red-500 text-xs font-black uppercase tracking-wider neo-border animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      <div className="mb-10 bg-hunter-grey p-6 neo-border border-zinc-800">
        <h2 className="font-display font-black text-xl uppercase tracking-tight mb-1">Automation</h2>
        <p className="text-zinc-500 font-display uppercase text-[10px] tracking-widest mb-6">
          Control scheduled scraping and contact enrichment behavior.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 p-4 bg-zinc-900/50 neo-border border-zinc-800">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-hunter-orange/10 flex items-center justify-center neo-border border-hunter-orange/30 shrink-0">
                <RefreshCw size={18} className="text-hunter-orange" />
              </div>
              <div>
                <div className="font-display font-bold uppercase tracking-tight">Auto-scrape every 30 min</div>
                <p className="text-zinc-500 text-[10px] font-display uppercase tracking-widest mt-1">
                  Runs active search keywords + watchlist targets on a schedule.
                </p>
              </div>
            </div>
            <HunterButton
              type="button"
              variant={automation.auto_scrape_enabled ? "primary" : "secondary"}
              disabled={isUpdatingAutomation}
              onClick={() => toggleAutomation("auto_scrape_enabled")}
              className="shrink-0 min-w-[88px]"
            >
              {isUpdatingAutomation ? <Loader2 size={16} className="animate-spin" /> : automation.auto_scrape_enabled ? "ON" : "OFF"}
            </HunterButton>
          </div>

          <div className="flex items-center justify-between gap-4 p-4 bg-zinc-900/50 neo-border border-zinc-800">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-500/10 flex items-center justify-center neo-border border-green-500/30 shrink-0">
                <Sparkles size={18} className="text-green-500" />
              </div>
              <div>
                <div className="font-display font-bold uppercase tracking-tight">Auto enrichment</div>
                <p className="text-zinc-500 text-[10px] font-display uppercase tracking-widest mt-1">
                  OFF = manual &quot;Find Contacts&quot; only. ON = runs when a lead is marked relevant.
                </p>
              </div>
            </div>
            <HunterButton
              type="button"
              variant={automation.auto_enrichment_enabled ? "primary" : "secondary"}
              disabled={isUpdatingAutomation}
              onClick={() => toggleAutomation("auto_enrichment_enabled")}
              className="shrink-0 min-w-[88px]"
            >
              {isUpdatingAutomation ? <Loader2 size={16} className="animate-spin" /> : automation.auto_enrichment_enabled ? "ON" : "OFF"}
            </HunterButton>
          </div>

          <div className="flex items-center justify-between gap-4 p-4 bg-zinc-900/50 neo-border border-zinc-800">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-500/10 flex items-center justify-center neo-border border-blue-500/30 shrink-0">
                <Activity size={18} className="text-blue-400" />
              </div>
              <div>
                <div className="font-display font-bold uppercase tracking-tight">Keep services awake</div>
                <p className="text-zinc-500 text-[10px] font-display uppercase tracking-widest mt-1">
                  Pings frontend, API, and AI every 10 min (Render free tier).
                  {!automation.keep_alive_configured && " Set FRONTEND_URL + AI_SERVICE_URL on Render."}
                </p>
              </div>
            </div>
            <HunterButton
              type="button"
              variant={automation.keep_alive_enabled ? "primary" : "secondary"}
              disabled={isUpdatingAutomation || !automation.keep_alive_configured}
              onClick={() => toggleAutomation("keep_alive_enabled")}
              className="shrink-0 min-w-[88px]"
            >
              {isUpdatingAutomation ? <Loader2 size={16} className="animate-spin" /> : automation.keep_alive_enabled ? "ON" : "OFF"}
            </HunterButton>
          </div>
        </div>
      </div>

      {/* Add Token Form */}
      <form onSubmit={addToken} className="space-y-4 mb-10 bg-hunter-grey p-6 neo-border border-zinc-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HunterInput
            placeholder="Label (e.g. 'Main Account')"
            value={newToken.label}
            onChange={(e) => setNewToken({ ...newToken, label: e.target.value })}
          />
          <div className="relative">
            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-hunter-orange" size={20} />
            <HunterInput
              type="password"
              placeholder="API Key"
              value={newToken.key}
              onChange={(e) => setNewToken({ ...newToken, key: e.target.value })}
              className="pl-12"
            />
          </div>
        </div>
        <HunterButton type="submit" variant="primary" className="w-full flex items-center justify-center gap-2">
          <Plus size={20} /> Add Key
        </HunterButton>
      </form>

      {/* Tokens List */}
      {activeLeases.length > 0 && (
        <div className="mb-4 bg-hunter-orange/10 border border-hunter-orange/40 p-4 text-xs">
          <p className="font-display font-black uppercase tracking-widest text-hunter-orange mb-2">
            Tokens in use right now
          </p>
          <ul className="space-y-1 text-zinc-300">
            {activeLeases.map((lease) => (
              <li key={`${lease.worker_id}-${lease.key_id}`}>
                <span className="text-white font-bold">{lease.key_label || "Unnamed key"}</span>
                {" "}→ worker <span className="font-mono text-hunter-orange">{lease.worker_id}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="p-10 text-center animate-pulse text-zinc-600 font-display uppercase tracking-widest text-sm flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-hunter-orange" />
            Loading...
          </div>
        ) : tokens.length === 0 ? (
          <div className="p-10 text-center border-2 border-dashed border-zinc-800 text-zinc-600 font-display uppercase tracking-widest text-sm">
            No keys found. Add a key to start finding leads.
          </div>
        ) : (
          tokens.map((token) => {
            const commentUsage = token.usage;
            const platformUsage = token.platform_usage;
            const used = commentUsage?.used ?? token.comments_used ?? 0;
            const limit = commentUsage?.limit ?? token.comments_limit ?? 2500;
            const remaining = commentUsage?.remaining ?? token.comments_remaining ?? Math.max(0, limit - used);
            const commentStatus = commentUsage?.status ?? (remaining === 0 ? "exhausted" : remaining <= 50 ? "low" : "active");
            const usagePct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
            const usageColor =
              commentStatus === "exhausted" || usagePct >= 95
                ? "bg-red-500"
                : commentStatus === "low" || usagePct >= 80
                  ? "bg-hunter-orange"
                  : "bg-green-500";
            const badgeLabel =
              token.assigned_worker
                ? "In Use"
                : commentStatus === "exhausted"
                ? "Limit Reached"
                : commentStatus === "low"
                  ? "Low Quota"
                  : token.is_active
                    ? "Active"
                    : "Disabled";
            const badgeClass =
              token.assigned_worker
                ? "bg-hunter-orange text-black"
                : commentStatus === "exhausted"
                ? "bg-red-500 text-white border-red-700"
                : commentStatus === "low"
                  ? "bg-hunter-orange text-black"
                  : token.is_active
                    ? "bg-green-500 text-black"
                    : "bg-zinc-800 text-zinc-500 border-zinc-700";

            return (
            <div
              key={token._id}
              className="flex items-center justify-between bg-zinc-900/50 p-4 neo-border border-zinc-800"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center neo-border ${token.is_active ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'}`}>
                  {token.is_active ? <ShieldCheck className="text-green-500" /> : <ShieldAlert className="text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-lg">{token.label || "Unnamed Key"}</div>
                  <div className="text-zinc-600 font-mono text-xs mb-2">••••••••{token.key.slice(-4)}</div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      Comments: <span className="text-white">{used}</span> / {limit}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      {remaining} left this month
                    </span>
                    {platformUsage?.limit != null && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        Platform: ${platformUsage.used ?? 0} / ${platformUsage.limit}
                      </span>
                    )}
                    {token.assigned_worker && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-hunter-orange">
                        Node: {token.assigned_worker}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 w-full max-w-xs bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full ${usageColor} transition-all`} style={{ width: `${usagePct}%` }} />
                  </div>
                  {(commentUsage?.exhausted || platformUsage?.exhausted) && (
                    <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-red-400/80">
                      {commentUsage?.extra_note || platformUsage?.extra_note || "Apify quota low or exhausted."}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <div className={`px-2 py-1 text-[10px] font-display font-bold uppercase tracking-tighter neo-border border-black ${badgeClass}`}>
                  {badgeLabel}
                </div>
                <button
                  onClick={() => deleteToken(token._id)}
                  className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* Lead Enrichment Section */}
      <div className="mt-16">
        <div className="mb-6">
          <h2 className="font-display font-black text-2xl uppercase tracking-tighter mb-1">
            Lead <span className="text-hunter-orange italic">Enrichment</span>
          </h2>
          <p className="text-zinc-500 font-display uppercase text-[10px] tracking-widest font-bold">
            Configure Contact Compass to automatically find verified business emails.
          </p>
        </div>

        <div className="bg-hunter-grey p-6 neo-border border-zinc-800">
          <ApiUsagePanel
            title="Contact Compass API"
            maskedCredential={ccTokenInfo.token}
            configured={ccTokenInfo.is_configured}
            usage={{
              status: ccTokenInfo.status,
              exhausted: ccTokenInfo.exhausted,
              rate_limited: ccTokenInfo.rate_limited,
              used: ccTokenInfo.lookups_used ?? 0,
              limit: ccTokenInfo.lookups_limit ?? 500,
              remaining: ccTokenInfo.remaining ?? ccTokenInfo.lookups_remaining ?? null,
              usage_label: "Lookups",
              extra_note: ccTokenInfo.extra_note,
            }}
            extraInline={
              ccTokenInfo.credits_left != null ? (
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  CC credits: <span className="text-hunter-orange">{ccTokenInfo.credits_left}</span>
                </span>
              ) : undefined
            }
            notConfiguredMessage="Lead enrichment is currently disabled. No API key configured."
          />

          <form onSubmit={updateCCToken} className="flex gap-4">
            <div className="relative flex-1">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-hunter-orange" size={20} />
              <HunterInput
                type="password"
                placeholder="Enter New Contact Compass Token"
                value={newCCToken}
                onChange={(e) => setNewCCToken(e.target.value)}
                className="pl-12"
              />
            </div>
            <HunterButton type="submit" variant="primary" disabled={isUpdatingCC || !newCCToken.trim()} className="px-8 flex items-center gap-2">
              {isUpdatingCC ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
              Update Token
            </HunterButton>
          </form>
        </div>

        <div className="bg-hunter-grey p-6 neo-border border-zinc-800 mt-6">
          <div className="mb-4">
          <p className="text-zinc-500 font-display uppercase text-[10px] tracking-widest font-bold">
            Verify emails after enrichment with Hunter.io (finder + verifier).
          </p>
          </div>

          <ApiUsagePanel
            title="Hunter.io API"
            maskedCredential={hunterKeyInfo.api_key}
            configured={hunterKeyInfo.is_configured}
            usage={{
              status: hunterKeyInfo.status,
              exhausted: hunterKeyInfo.exhausted,
              rate_limited: hunterKeyInfo.rate_limited,
              plan_name: hunterKeyInfo.plan_name,
              reset_date: hunterKeyInfo.reset_date,
              extra_note:
                hunterKeyInfo.exhausted || hunterKeyInfo.rate_limited
                  ? "Hunter.io quota exhausted — finder and verifier skipped until plan resets or you upgrade."
                  : undefined,
            }}
            primary={
              hunterKeyInfo.searches_limit != null
                ? {
                    label: "Searches",
                    used: hunterKeyInfo.searches_used ?? 0,
                    limit: hunterKeyInfo.searches_limit,
                    remaining: hunterKeyInfo.searches_remaining ?? null,
                  }
                : undefined
            }
            secondary={
              hunterKeyInfo.verifications_limit != null && hunterKeyInfo.verifications_limit > 0
                ? {
                    label: "Verifications",
                    used: hunterKeyInfo.verifications_used ?? 0,
                    limit: hunterKeyInfo.verifications_limit,
                    remaining: hunterKeyInfo.verifications_remaining ?? null,
                  }
                : undefined
            }
            notConfiguredMessage="Email verification falls back to domain checks only. No Hunter.io key configured."
          />
          {hunterKeyInfo.is_configured && hunterKeyInfo.searches_limit == null && hunterKeyInfo.rate_limited && (
            <p className="mb-6 text-[10px] font-black uppercase tracking-widest text-red-400/80">
              Hunter.io returned rate limit (429) — quota likely exhausted this billing period.
            </p>
          )}

          <form onSubmit={updateHunterKey} className="flex gap-4">
            <div className="relative flex-1">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-hunter-orange" size={20} />
              <HunterInput
                type="password"
                placeholder="Enter Hunter.io API Key"
                value={newHunterKey}
                onChange={(e) => setNewHunterKey(e.target.value)}
                className="pl-12"
              />
            </div>
            <HunterButton type="submit" variant="primary" disabled={isUpdatingHunter || !newHunterKey.trim()} className="px-8 flex items-center gap-2">
              {isUpdatingHunter ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
              Update Key
            </HunterButton>
          </form>
        </div>

        <div className="bg-hunter-grey p-6 neo-border border-zinc-800 mt-6">
          <p className="text-zinc-500 font-display uppercase text-[10px] tracking-widest font-bold mb-4">
            Phone enrichment — ContactOut (LinkedIn profile + include_phone).
          </p>
          <ApiUsagePanel
            title="ContactOut API"
            maskedCredential={contactOutInfo.token}
            configured={contactOutInfo.is_configured}
            usage={{
              status: contactOutInfo.status,
              exhausted: contactOutInfo.exhausted,
              rate_limited: contactOutInfo.rate_limited,
              used: contactOutInfo.used,
              limit: contactOutInfo.limit,
              remaining: contactOutInfo.remaining,
              usage_label: "Credits",
              extra_note: contactOutInfo.extra_note,
            }}
            notConfiguredMessage="No ContactOut token configured."
          />
          <form onSubmit={updateContactOutToken} className="flex gap-4">
            <div className="relative flex-1">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-hunter-orange" size={20} />
              <HunterInput type="password" placeholder="ContactOut API token" value={newContactOutToken} onChange={(e) => setNewContactOutToken(e.target.value)} className="pl-12" />
            </div>
            <HunterButton type="submit" variant="primary" disabled={isUpdatingContactOut || !newContactOutToken.trim()} className="px-8">
              {isUpdatingContactOut ? <Loader2 size={20} className="animate-spin" /> : "Update"}
            </HunterButton>
          </form>
        </div>

        <div className="bg-hunter-grey p-6 neo-border border-zinc-800 mt-6">
          <p className="text-zinc-500 font-display uppercase text-[10px] tracking-widest font-bold mb-4">
            Phone enrichment — Apollo.io (people/match, reveal_phone_number).
          </p>
          <ApiUsagePanel
            title="Apollo.io API"
            maskedCredential={apolloKeyInfo.api_key}
            configured={apolloKeyInfo.is_configured}
            usage={{
              status: apolloKeyInfo.status,
              exhausted: apolloKeyInfo.exhausted,
              rate_limited: apolloKeyInfo.rate_limited,
              used: apolloKeyInfo.used,
              limit: apolloKeyInfo.limit,
              remaining: apolloKeyInfo.remaining,
              plan_name: apolloKeyInfo.plan_name,
              reset_date: apolloKeyInfo.reset_date,
              usage_label: "Credits",
              extra_note: apolloKeyInfo.extra_note,
            }}
            notConfiguredMessage="No Apollo API key configured."
          />
          <form onSubmit={updateApolloKey} className="flex gap-4">
            <div className="relative flex-1">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-hunter-orange" size={20} />
              <HunterInput type="password" placeholder="Apollo API key" value={newApolloKey} onChange={(e) => setNewApolloKey(e.target.value)} className="pl-12" />
            </div>
            <HunterButton type="submit" variant="primary" disabled={isUpdatingApollo || !newApolloKey.trim()} className="px-8">
              {isUpdatingApollo ? <Loader2 size={20} className="animate-spin" /> : "Update"}
            </HunterButton>
          </form>
        </div>
      </div>
    </div>
  );
}
