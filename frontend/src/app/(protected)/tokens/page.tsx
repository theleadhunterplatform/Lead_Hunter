"use client";

import { useState, useEffect } from "react";
import { Button as HunterButton, Input as HunterInput } from "@/components/ui/HunterUI";
import { Key, Plus, Trash2, ShieldCheck, ShieldAlert, Loader2, Mail, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function TokensPage() {
  const router = useRouter();
  const { hasPermission, loading: authLoading } = useAuth();
  const [tokens, setTokens] = useState<{
    _id: string;
    key: string;
    label: string;
    is_active: boolean;
    comments_used?: number;
    comments_limit?: number;
    comments_remaining?: number;
  }[]>([]);
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
  }>({ token: null, is_configured: false });
  const [newCCToken, setNewCCToken] = useState("");
  const [isUpdatingCC, setIsUpdatingCC] = useState(false);

  const [hunterKeyInfo, setHunterKeyInfo] = useState<{
    api_key: string | null;
    is_configured: boolean;
  }>({ api_key: null, is_configured: false });
  const [newHunterKey, setNewHunterKey] = useState("");
  const [isUpdatingHunter, setIsUpdatingHunter] = useState(false);

  const [contactOutInfo, setContactOutInfo] = useState<{
    token: string | null;
    is_configured: boolean;
  }>({ token: null, is_configured: false });
  const [newContactOutToken, setNewContactOutToken] = useState("");
  const [isUpdatingContactOut, setIsUpdatingContactOut] = useState(false);

  const [apolloKeyInfo, setApolloKeyInfo] = useState<{
    api_key: string | null;
    is_configured: boolean;
  }>({ api_key: null, is_configured: false });
  const [newApolloKey, setNewApolloKey] = useState("");
  const [isUpdatingApollo, setIsUpdatingApollo] = useState(false);

  const fetchTokens = async () => {
    try {
      const response = await api.get("/apify-keys");
      setTokens(response.data.data);
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

  useEffect(() => {
    if (!authLoading) {
      if (!hasPermission('scraping:manage')) {
        router.push("/dashboard");
        return;
      }
      fetchTokens();
      fetchCCToken();
      fetchHunterKey();
      fetchContactOutToken();
      fetchApolloKey();
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
            const used = token.comments_used ?? 0;
            const limit = token.comments_limit ?? 2500;
            const remaining = token.comments_remaining ?? Math.max(0, limit - used);
            const usagePct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
            const usageColor =
              usagePct >= 95 ? "bg-red-500" : usagePct >= 80 ? "bg-hunter-orange" : "bg-green-500";

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
                  </div>
                  <div className="mt-2 h-1.5 w-full max-w-xs bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full ${usageColor} transition-all`} style={{ width: `${usagePct}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <div className={`px-2 py-1 text-[10px] font-display font-bold uppercase tracking-tighter neo-border ${token.is_active ? 'bg-green-500 text-black border-black' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                  {token.is_active ? "Active" : "Disabled"}
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
          {ccTokenInfo.is_configured ? (
            <div className="mb-6 p-4 bg-zinc-900/50 neo-border border-zinc-800">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-hunter-orange/10 flex items-center justify-center neo-border border-hunter-orange/30">
                    <Mail size={20} className="text-hunter-orange" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-lg uppercase tracking-tight">Contact Compass API</div>
                    <div className="text-zinc-600 font-mono text-xs">{ccTokenInfo.token}</div>
                  </div>
                </div>
                <div className="px-3 py-1 bg-hunter-orange text-black text-[10px] font-black uppercase tracking-widest neo-border border-black shrink-0">
                  Active
                </div>
              </div>
              {(() => {
                const used = ccTokenInfo.lookups_used ?? 0;
                const limit = ccTokenInfo.lookups_limit ?? 500;
                const remaining = ccTokenInfo.lookups_remaining ?? Math.max(0, limit - used);
                const usagePct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                const usageColor =
                  usagePct >= 95 ? "bg-red-500" : usagePct >= 80 ? "bg-hunter-orange" : "bg-green-500";

                return (
                  <>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        Lookups: <span className="text-white">{used}</span> / {limit}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        {remaining} left this month
                      </span>
                      {ccTokenInfo.credits_left != null && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          CC credits: <span className="text-hunter-orange">{ccTokenInfo.credits_left}</span>
                        </span>
                      )}
                    </div>
                    <div className="mt-2 h-1.5 w-full max-w-xs bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${usageColor} transition-all`} style={{ width: `${usagePct}%` }} />
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="mb-6 p-4 bg-red-500/5 neo-border border-red-500/20 flex items-center gap-3">
              <ShieldAlert className="text-red-500" size={20} />
              <p className="text-red-500/70 text-[10px] font-black uppercase tracking-widest">Lead enrichment is currently disabled. No API key configured.</p>
            </div>
          )}

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

          {hunterKeyInfo.is_configured ? (
            <div className="mb-6 p-4 bg-zinc-900/50 neo-border border-zinc-800">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-500/10 flex items-center justify-center neo-border border-green-500/30">
                    <CheckCircle2 size={20} className="text-green-500" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-lg uppercase tracking-tight">Hunter.io API</div>
                    <div className="text-zinc-600 font-mono text-xs">{hunterKeyInfo.api_key}</div>
                  </div>
                </div>
                <div className="px-3 py-1 bg-green-500 text-black text-[10px] font-black uppercase tracking-widest neo-border border-black shrink-0">
                  Active
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-red-500/5 neo-border border-red-500/20 flex items-center gap-3">
              <ShieldAlert className="text-red-500" size={20} />
              <p className="text-red-500/70 text-[10px] font-black uppercase tracking-widest">
                Email verification falls back to domain checks only. No Hunter.io key configured.
              </p>
            </div>
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
          {contactOutInfo.is_configured ? (
            <div className="mb-6 p-4 bg-zinc-900/50 neo-border border-zinc-800 font-mono text-xs text-zinc-600">
              Active: {contactOutInfo.token}
            </div>
          ) : (
            <p className="mb-6 text-red-500/70 text-[10px] font-black uppercase tracking-widest">No ContactOut token configured.</p>
          )}
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
          {apolloKeyInfo.is_configured ? (
            <div className="mb-6 p-4 bg-zinc-900/50 neo-border border-zinc-800 font-mono text-xs text-zinc-600">
              Active: {apolloKeyInfo.api_key}
            </div>
          ) : (
            <p className="mb-6 text-red-500/70 text-[10px] font-black uppercase tracking-widest">No Apollo API key configured.</p>
          )}
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
