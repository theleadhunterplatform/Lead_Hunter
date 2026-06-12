"use client";

import { useState, useEffect } from "react";
import { Button as HunterButton, Input as HunterInput } from "@/components/ui/HunterUI";
import { Key, Plus, Trash2, ShieldCheck, ShieldAlert, Loader2, Mail } from "lucide-react";
import api from "@/lib/api";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function TokensPage() {
  const router = useRouter();
  const { hasPermission, loading: authLoading } = useAuth();
  const [tokens, setTokens] = useState<{ _id: string; key: string; label: string; is_active: boolean }[]>([]);
  const [newToken, setNewToken] = useState({ key: "", label: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Contact Compass State
  const [ccTokenInfo, setCCTokenInfo] = useState<{ token: string | null; is_configured: boolean }>({ token: null, is_configured: false });
  const [newCCToken, setNewCCToken] = useState("");
  const [isUpdatingCC, setIsUpdatingCC] = useState(false);

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

  useEffect(() => {
    if (!authLoading) {
      if (!hasPermission('scraping:manage')) {
        router.push("/leads");
        return;
      }
      fetchTokens();
      fetchCCToken();
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
          tokens.map((token) => (
            <div
              key={token._id}
              className="flex items-center justify-between bg-zinc-900/50 p-4 neo-border border-zinc-800"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 flex items-center justify-center neo-border ${token.is_active ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'}`}>
                  {token.is_active ? <ShieldCheck className="text-green-500" /> : <ShieldAlert className="text-red-500" />}
                </div>
                <div>
                  <div className="font-display font-bold text-lg">{token.label || "Unnamed Key"}</div>
                  <div className="text-zinc-600 font-mono text-xs">••••••••{token.key.slice(-4)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
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
          ))
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
            <div className="flex items-center justify-between mb-6 p-4 bg-zinc-900/50 neo-border border-zinc-800">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-hunter-orange/10 flex items-center justify-center neo-border border-hunter-orange/30">
                  <Mail size={20} className="text-hunter-orange" />
                </div>
                <div>
                  <div className="font-display font-bold text-lg uppercase tracking-tight">Contact Compass API</div>
                  <div className="text-zinc-600 font-mono text-xs">{ccTokenInfo.token}</div>
                </div>
              </div>
              <div className="px-3 py-1 bg-hunter-orange text-black text-[10px] font-black uppercase tracking-widest neo-border border-black">
                Configured
              </div>
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
      </div>
    </div>
  );
}
