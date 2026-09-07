"use client";

import { useState, useEffect } from "react";
import { Button as HunterButton, Input as HunterInput } from "@/components/ui/HunterUI";
import { Plus, Trash2, Search, Hash, Edit2, Check, X, Play, Loader2 } from "lucide-react";
import { LinkedinLogo, XLogo, RedditLogo, ThreadsLogo } from "@/components/BrandIcons";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { ADMIN_ROUTES } from "@/lib/routes";

export default function KeywordsPage() {
  const router = useRouter();
  const { hasPermission, loading: authLoading } = useAuth();
  const [keywords, setKeywords] = useState<{ _id: string; text: string; platforms: string[]; is_active: boolean }[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["linkedin"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editPlatforms, setEditPlatforms] = useState<string[]>([]);
  const [isBulkAdd, setIsBulkAdd] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionPlatforms, setBulkActionPlatforms] = useState<string[]>(["linkedin"]);
  const [scraping, setScraping] = useState(false);
  const [scrapingId, setScrapingId] = useState<string | null>(null);

  const canScrape = hasPermission('scraper:run');

  const fetchKeywords = async () => {
    try {
      const response = await api.get("/keywords");
      setKeywords(response.data.data);
    } catch (error: any) {
      console.error("Failed to fetch keywords", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!hasPermission('keyword:create')) {
        router.push(ADMIN_ROUTES.dashboard);
        return;
      }
      fetchKeywords();
    }
  }, [authLoading, hasPermission, router]);

  const addKeyword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedPlatforms.length === 0) {
      setError("Please select at least one platform.");
      return;
    }
    setError("");

    const texts = isBulkAdd
      ? bulkText.split('\n').map(t => t.trim()).filter(t => t.length > 0)
      : newKeyword.trim()
        ? [newKeyword.trim()]
        : [];

    if (texts.length === 0) return;

    try {
      await api.post("/keywords/bulk", {
        texts,
        platforms: selectedPlatforms
      });
      if (isBulkAdd) {
        setBulkText("");
        setIsBulkAdd(false);
      } else {
        setNewKeyword("");
      }
      fetchKeywords();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to add keyword.";
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      console.error("Failed to add keyword", err);
    }
  };

  const deleteKeyword = async (id: string) => {
    setError("");
    try {
      await api.delete(`/keywords/${id}`);
      fetchKeywords();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to delete keyword.";
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      console.error("Failed to delete keyword", err);
    }
  };

  const startEditing = (kw: any) => {
    setEditingId(kw._id);
    setEditText(kw.text);
    setEditPlatforms(kw.platforms || []);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText("");
    setEditPlatforms([]);
  };

  const saveEdit = async () => {
    if (!editText.trim()) return;
    if (editPlatforms.length === 0) {
      setError("Please select at least one platform.");
      return;
    }
    setError("");

    try {
      await api.put(`/keywords/${editingId}`, {
        text: editText,
        platforms: editPlatforms
      });
      setEditingId(null);
      fetchKeywords();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to update keyword.";
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      console.error("Failed to update keyword", err);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setError("");
    try {
      await api.delete("/keywords/bulk", { data: { ids: selectedIds } });
      setSelectedIds([]);
      fetchKeywords();
    } catch (err: any) {
      setError("Failed to delete bulk keywords.");
    }
  };

  const bulkUpdatePlatforms = async () => {
    if (selectedIds.length === 0 || bulkActionPlatforms.length === 0) return;
    setError("");
    try {
      await api.put("/keywords/bulk", { ids: selectedIds, updateData: { platforms: bulkActionPlatforms } });
      fetchKeywords();
    } catch (err: any) {
      setError("Failed to update platforms for selected keywords.");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === keywords.length && keywords.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(keywords.map(kw => kw._id));
    }
  };

  const startScrapingKeyword = async (kw: { _id: string; text: string; is_active: boolean }) => {
    if (!kw.is_active) {
      toast.error("Keyword is paused", { description: "Activate this keyword before scraping." });
      return;
    }

    setScrapingId(kw._id);
    setError("");
    try {
      const { data } = await api.post(`/scrapers/keyword/${kw._id}`);
      toast.success("Scraping started", {
        description: data.message || `Queued scrape for "${kw.text}"`,
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Failed to start scraping.";
      toast.error("Could not start scraping", { description: msg });
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setScrapingId(null);
    }
  };

  const startScraping = async () => {
    if (keywords.length === 0) {
      toast.error("Add keywords first", {
        description: "You need at least one active search keyword before scraping.",
      });
      return;
    }

    setScraping(true);
    setError("");
    try {
      const { data } = await api.post("/scrapers/all");
      toast.success("Scraping started", {
        description: data.message || "Jobs queued for all enabled platforms on each keyword.",
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || "Failed to start scraping.";
      toast.error("Could not start scraping", { description: msg });
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl relative min-h-screen">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-4xl uppercase tracking-tighter mb-2">
            Search <span className="text-hunter-orange">Keywords</span>
          </h1>
          <p className="text-zinc-500 font-display uppercase text-xs tracking-widest">
            Use buyer phrases only. Scrape one keyword with ▶ or all with Scrape All — each runs on that keyword&apos;s enabled platforms.
          </p>
        </div>

        {canScrape && (
          <HunterButton
            type="button"
            variant="primary"
            onClick={startScraping}
            disabled={scraping || loading}
            className="px-6 flex items-center gap-2 w-full sm:w-auto shrink-0"
          >
            {scraping ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
            {scraping ? "Queueing..." : "Scrape All"}
          </HunterButton>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border-2 border-red-500 p-4 text-red-500 text-xs font-black uppercase tracking-wider neo-border animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {/* Add Keyword Form */}
      {hasPermission('keyword:create') && (
        <div className="mb-10 bg-hunter-grey p-6 neo-border border-zinc-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {isBulkAdd ? "Bulk Add (One per line)" : "Single Add"}
            </h2>
            <button
              onClick={() => setIsBulkAdd(!isBulkAdd)}
              className="text-[9px] font-black uppercase tracking-widest text-hunter-orange hover:underline"
            >
              Switch to {isBulkAdd ? "Single Add" : "Bulk Add"}
            </button>
          </div>

          <form onSubmit={addKeyword} className="flex flex-col gap-4 mb-4">
            <div className="relative">
              {isBulkAdd ? (
                <textarea
                  placeholder="Enter keywords, one per line..."
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full bg-black/40 border-2 border-zinc-800 p-4 text-white font-display text-sm focus:border-hunter-orange focus:outline-none transition-all h-32 neo-border"
                />
              ) : (
                <>
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-hunter-orange" size={20} />
                  <HunterInput
                    placeholder="Enter search phrase (e.g. 'Looking for marketing services')"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    className="pl-12"
                  />
                </>
              )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex gap-4 items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Target Platforms:</span>
                <div className="flex gap-2">
                  {["linkedin", "twitter", "reddit", "threads"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPlatforms(prev =>
                        prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
                      )}
                      className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest neo-border transition-all ${selectedPlatforms.includes(p)
                        ? "bg-hunter-orange text-black border-hunter-orange"
                        : "bg-zinc-800 text-zinc-500 border-zinc-700"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        {p === 'linkedin' && <LinkedinLogo className={`w-3.5 h-3.5 ${selectedPlatforms.includes(p) ? 'text-black' : 'text-zinc-500'}`} />}
                        {p === 'twitter' && <XLogo className={`w-3.5 h-3.5 ${selectedPlatforms.includes(p) ? 'text-black' : 'text-zinc-500'}`} />}
                        {p === 'reddit' && <RedditLogo className={`w-3.5 h-3.5 ${selectedPlatforms.includes(p) ? 'text-black' : 'text-zinc-500'}`} />}
                        {p === 'threads' && <ThreadsLogo className={`w-3.5 h-3.5 ${selectedPlatforms.includes(p) ? 'text-black' : 'text-zinc-500'}`} />}
                        <span>{p}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <HunterButton type="submit" variant="primary" className="px-8 flex items-center gap-2 w-full md:w-auto">
                <Plus size={20} /> {isBulkAdd ? "Add All Keywords" : "Add Keyword"}
              </HunterButton>
            </div>
          </form>
        </div>
      )}

      {/* Keywords List Header */}
      <div className="flex justify-between items-center mb-4 px-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedIds.length === keywords.length && keywords.length > 0}
            onChange={toggleSelectAll}
            className="w-4 h-4 bg-black border-zinc-700 rounded-none checked:bg-hunter-orange accent-hunter-orange cursor-pointer"
          />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            {selectedIds.length > 0 ? `${selectedIds.length} Selected` : "Select All"}
          </span>
        </div>
      </div>

      {/* Keywords List */}
      <div className="space-y-4 pb-32">
        {loading ? (
          <div className="p-10 text-center animate-pulse text-zinc-600 font-display uppercase tracking-widest text-sm">
            Loading...
          </div>
        ) : keywords.length === 0 ? (
          <div className="p-10 text-center border-2 border-dashed border-zinc-800 text-zinc-600 font-display uppercase tracking-widest text-sm">
            No keywords found. Start adding some!
          </div>
        ) : (
          keywords.map((kw) => (
            <div
              key={kw._id}
              className={`flex items-center justify-between p-4 neo-border transition-all group ${editingId === kw._id
                ? "bg-zinc-800 border-hunter-orange shadow-[0_0_15px_rgba(255,165,0,0.1)]"
                : selectedIds.includes(kw._id)
                  ? "bg-hunter-orange/5 border-hunter-orange/50"
                  : "bg-zinc-900/50 border-zinc-800 hover:border-hunter-orange"
                }`}
            >
              <div className="flex-1 flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(kw._id)}
                  onChange={() => {
                    setSelectedIds(prev =>
                      prev.includes(kw._id) ? prev.filter(id => id !== kw._id) : [...prev, kw._id]
                    );
                  }}
                  className="w-4 h-4 bg-black border-zinc-700 rounded-none checked:bg-hunter-orange accent-hunter-orange cursor-pointer"
                />

                <div className={`w-10 h-10 flex items-center justify-center neo-border transition-colors ${editingId === kw._id ? "bg-hunter-orange text-black border-black" : "bg-hunter-orange/10 text-hunter-orange border-hunter-orange/20"
                  }`}>
                  <Search size={18} />
                </div>

                {editingId === kw._id ? (
                  <div className="flex-1 flex flex-col gap-3">
                    <HunterInput
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="bg-black/40 border-zinc-700 h-9 text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      {["linkedin", "twitter", "reddit", "threads"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setEditPlatforms(prev =>
                            prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
                          )}
                          className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest neo-border transition-all ${editPlatforms.includes(p)
                            ? "bg-hunter-orange text-black border-black"
                            : "bg-zinc-900 text-zinc-500 border-zinc-700"
                            }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="font-display font-bold text-lg block">{kw.text}</span>
                    <div className="flex gap-2 mt-1">
                      {kw.platforms?.map((p: string) => (
                        <span key={p} className="text-[7px] font-black uppercase tracking-tighter text-zinc-500 bg-zinc-800 px-1 rounded-sm border border-zinc-700">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                {editingId === kw._id ? (
                  <>
                    <button
                      onClick={saveEdit}
                      className="p-2 text-green-500 hover:bg-green-500/10 transition-all rounded-sm"
                      title="Save Changes"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="p-2 text-zinc-500 hover:bg-zinc-500/10 transition-all rounded-sm"
                      title="Cancel"
                    >
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    {canScrape && (
                      <button
                        onClick={() => startScrapingKeyword(kw)}
                        disabled={scrapingId === kw._id || scraping || !kw.is_active}
                        className="p-2 text-hunter-orange hover:bg-hunter-orange/10 transition-all rounded-sm disabled:opacity-40"
                        title={kw.is_active ? "Scrape this keyword" : "Activate keyword to scrape"}
                      >
                        {scrapingId === kw._id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Play size={16} />
                        )}
                      </button>
                    )}
                    {hasPermission('keyword:update') && (
                      <button
                        onClick={() => startEditing(kw)}
                        className="p-2 text-zinc-600 hover:text-hunter-orange hover:bg-hunter-orange/10 transition-all opacity-0 group-hover:opacity-100 rounded-sm"
                        title="Edit Keyword"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    {hasPermission('keyword:delete') && (
                      <button
                        onClick={() => deleteKeyword(kw._id)}
                        className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 rounded-sm"
                        title="Delete Keyword"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-black neo-border border-hunter-orange p-4 flex items-center gap-6 shadow-[0_0_50px_rgba(255,165,0,0.2)] animate-in slide-in-from-bottom-10 z-50">
          <div className="pr-6 border-r border-zinc-800">
            <span className="text-[10px] font-black uppercase tracking-widest text-hunter-orange">
              {selectedIds.length} Selected
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Target:</span>
            <div className="flex gap-1">
              {["linkedin", "twitter", "reddit", "threads"].map((p) => (
                <button
                  key={p}
                  onClick={() => setBulkActionPlatforms(prev =>
                    prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
                  )}
                  className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest neo-border transition-all ${bulkActionPlatforms.includes(p)
                    ? "bg-hunter-orange text-black border-hunter-orange"
                    : "bg-zinc-900 text-zinc-500 border-zinc-800"
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={bulkUpdatePlatforms}
              disabled={bulkActionPlatforms.length === 0}
              className="ml-2 px-3 py-1.5 bg-hunter-orange text-black text-[9px] font-black uppercase tracking-widest hover:bg-hunter-orange/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update All
            </button>
          </div>

          <button
            onClick={bulkDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-2 border-red-500 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-black transition-all neo-border ml-auto"
          >
            <Trash2 size={14} /> Delete
          </button>

          <button
            onClick={() => setSelectedIds([])}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
