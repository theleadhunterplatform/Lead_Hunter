"use client";

import { Button, Input } from "@/components/ui/HunterUI";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_ROUTES } from "@/lib/routes";
import api from "@/lib/api";
import { Check, Edit2, ExternalLink, Plus, RefreshCw, Trash2, UserSearch, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Target = {
  _id: string;
  name: string;
  url: string;
  platform: string;
  notes?: string;
  is_active: boolean;
  last_scraped_at?: string | null;
  last_comments_found?: number;
  monthly_comments_found?: number;
};

export default function TargetsPage() {
  const router = useRouter();
  const { hasPermission, loading: authLoading } = useAuth();
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [scrapingAll, setScrapingAll] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const canCreate = hasPermission("target:create");
  const canUpdate = hasPermission("target:update");
  const canDelete = hasPermission("target:delete");

  const fetchTargets = async () => {
    try {
      const { data } = await api.get("/targets");
      setTargets(data.data);
    } catch (err) {
      console.error("Failed to fetch targets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!hasPermission("target:read")) {
        router.push(ADMIN_ROUTES.dashboard);
        return;
      }
      fetchTargets();
    }
  }, [authLoading, hasPermission, router]);

  const addTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setError("");

    try {
      await api.post("/targets", { name, url, notes });
      setName("");
      setUrl("");
      setNotes("");
      fetchTargets();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add target.");
    }
  };

  const toggleActive = async (target: Target) => {
    if (!canUpdate) return;
    try {
      await api.put(`/targets/${target._id}`, { is_active: !target.is_active });
      fetchTargets();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update target.");
    }
  };

  const deleteTarget = async (id: string) => {
    if (!canDelete) return;
    setError("");
    try {
      await api.delete(`/targets/${id}`);
      fetchTargets();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete target.");
    }
  };

  const startEdit = (t: Target) => {
    setEditingId(t._id);
    setEditName(t.name);
    setEditUrl(t.url);
    setEditNotes(t.notes || "");
  };

  const scrapeTarget = async (id: string) => {
    if (!canUpdate) return;
    setError("");
    setSuccessMsg("");
    setScrapingId(id);
    try {
      const { data } = await api.post(`/targets/${id}/scrape`);
      setSuccessMsg(data.message || "Scrape queued.");
      fetchTargets();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to queue scrape.");
    } finally {
      setScrapingId(null);
    }
  };

  const scrapeAllTargets = async () => {
    if (!canUpdate) return;
    const activeCount = targets.filter((t) => t.is_active).length;
    if (activeCount === 0) {
      setError("No active targets to scrape.");
      return;
    }
    setError("");
    setSuccessMsg("");
    setScrapingAll(true);
    try {
      const { data } = await api.post("/targets/scrape-all");
      setSuccessMsg(data.message || `Scrape queued for ${activeCount} targets.`);
      fetchTargets();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to queue scrape for all targets.");
    } finally {
      setScrapingAll(false);
    }
  };

  const formatLastChecked = (date?: string | null) => {
    if (!date) return "Never checked";
    return new Date(date).toLocaleString();
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await api.put(`/targets/${editingId}`, {
        name: editName,
        url: editUrl,
        notes: editNotes,
      });
      setEditingId(null);
      fetchTargets();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save changes.");
    }
  };

  if (loading || authLoading) {
    return <div className="p-8 text-zinc-500 font-bold uppercase text-xs">Loading watchlist...</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-3xl uppercase tracking-tighter text-white">
            Watchlist <span className="text-hunter-orange">Targets</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-2">
            Monitor LinkedIn profiles for comment activity — parent posts are captured as leads.
          </p>
        </div>
        {canUpdate && targets.some((t) => t.is_active) && (
          <Button
            onClick={scrapeAllTargets}
            disabled={scrapingAll}
            className="uppercase font-black text-xs flex items-center gap-2 shrink-0"
          >
            <RefreshCw size={14} className={scrapingAll ? "animate-spin" : ""} />
            {scrapingAll ? "Queueing All..." : "Scrape All Active"}
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm">{error}</div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500 text-green-400 text-sm">{successMsg}</div>
      )}

      {canCreate && (
        <form onSubmit={addTarget} className="mb-8 p-6 bg-hunter-grey border-2 border-zinc-800 space-y-4">
          <h2 className="font-display font-bold uppercase text-xs tracking-widest text-hunter-orange flex items-center gap-2">
            <Plus size={14} /> Add Target
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input
              placeholder="LinkedIn URL (linkedin.com/in/...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          <Input
            placeholder="Notes (optional — why you're watching them)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button type="submit" className="uppercase font-black text-xs">
            Add to Watchlist
          </Button>
        </form>
      )}

      <div className="space-y-3">
        {targets.length === 0 ? (
          <div className="text-center py-16 text-zinc-600 border-2 border-dashed border-zinc-800">
            <UserSearch className="mx-auto mb-3 opacity-50" size={32} />
            <p className="font-bold uppercase text-xs">No targets yet</p>
          </div>
        ) : (
          targets.map((t) => (
            <div
              key={t._id}
              className={`p-4 border-2 flex flex-col md:flex-row md:items-center gap-4 ${
                t.is_active ? "border-zinc-800 bg-hunter-grey" : "border-zinc-900 bg-zinc-950 opacity-60"
              }`}
            >
              {editingId === t._id ? (
                <div className="flex-1 space-y-2">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
                  <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit}><Check size={14} /></Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}><X size={14} /></Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-white truncate">{t.name}</div>
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-hunter-orange text-xs flex items-center gap-1 hover:underline truncate"
                    >
                      {t.url} <ExternalLink size={10} />
                    </a>
                    {t.notes && <p className="text-zinc-500 text-xs mt-1">{t.notes}</p>}
                    <p className="text-zinc-600 text-[10px] mt-1 uppercase font-bold tracking-wider">
                      Last checked: {formatLastChecked(t.last_scraped_at)}
                    </p>
                    {t.last_scraped_at && (
                      <p className="text-zinc-500 text-[10px] mt-0.5 uppercase font-bold tracking-wider">
                        Last run: <span className="text-hunter-orange">{t.last_comments_found ?? 0}</span> comments
                        {" · "}
                        This month: <span className="text-white">{t.monthly_comments_found ?? 0}</span> comments
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-1 ${
                        t.is_active ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {t.is_active ? "Active" : "Paused"}
                    </span>
                    {canUpdate && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => scrapeTarget(t._id)}
                          disabled={!t.is_active || scrapingId === t._id}
                        >
                          <RefreshCw size={14} className={scrapingId === t._id ? "animate-spin" : ""} />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => toggleActive(t)}>
                          {t.is_active ? "Pause" : "Activate"}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => startEdit(t)}>
                          <Edit2 size={14} />
                        </Button>
                      </>
                    )}
                    {canDelete && (
                      <Button size="sm" variant="secondary" onClick={() => deleteTarget(t._id)}>
                        <Trash2 size={14} className="text-red-400" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
