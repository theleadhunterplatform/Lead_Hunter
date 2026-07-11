"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Mail, Phone, Clock, User, ExternalLink, CheckCircle2, Sparkles, Copy, RefreshCw } from "lucide-react";
import { Button, Input } from "@/components/ui/HunterUI";
import api from "@/lib/api";
import { cn } from "@/components/ui/HunterUI";
import { toast } from "sonner";
import { LinkedinLogo, XLogo } from "@/components/BrandIcons";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_ROUTES } from "@/lib/routes";
import { getApiError } from "@/lib/errors";
import {
  formatVerifiedByLabel,
  getEmailStatusBadge,
} from "@/lib/email-verification";
import { LeadAccessGate } from "@/components/LeadAccessGate";

interface ClaimedLead {
  _id: string;
  status: string;
  notes: string;
  last_contacted: string | null;
  timestamp: string;
  outreach_subject?: string | null;
  outreach_body?: string | null;
  outreach_generated_at?: string | null;
  leadId: {
    _id: string;
    author: {
      name: string;
      handle?: string;
      avatar?: { url: string };
    };
    content: string;
    platform: string;
    url: string;
    email?: string;
    contact_info?: {
       email_status?: string;
       verified_by?: string[];
       phone_numbers?: { number: string; type: string }[];
    };
  };
}

export default function CRMPage() {
  const router = useRouter();
  const { permissions, loading: authLoading } = useAuth();
  const [claims, setClaims] = useState<ClaimedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [sendingEmailIds, setSendingEmailIds] = useState<string[]>([]);
  const [generatingIds, setGeneratingIds] = useState<string[]>([]);
  const [draftEdits, setDraftEdits] = useState<Record<string, { subject: string; body: string }>>({});

  const fetchClaimedLeads = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/posts/claimed");
      setClaims(data.data || []);
    } catch (error) {
      console.error("Failed to fetch claimed leads", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (permissions.has('*')) {
      router.replace(ADMIN_ROUTES.leadIntelligence);
    }
  }, [authLoading, permissions, router]);

  useEffect(() => {
    if (authLoading || permissions.has('*')) return;
    fetchClaimedLeads();
  }, [authLoading, permissions]);

  const updateStatus = async (claimId: string, status: string) => {
    try {
      setSavingIds(prev => [...prev, claimId]);
      await api.put(`/crm/claims/${claimId}`, { status });
      setClaims(prev => prev.map(c => c._id === claimId ? { ...c, status } : c));
      toast.success("Status updated");
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setSavingIds(prev => prev.filter(id => id !== claimId));
    }
  };

  const updateNotes = async (claimId: string, notes: string) => {
    try {
      setSavingIds(prev => [...prev, claimId]);
      await api.put(`/crm/claims/${claimId}`, { notes });
      setClaims(prev => prev.map(c => c._id === claimId ? { ...c, notes } : c));
      toast.success("Notes saved");
    } catch (error) {
      toast.error("Failed to save notes");
    } finally {
      setSavingIds(prev => prev.filter(id => id !== claimId));
    }
  };

  const getDraft = (claim: ClaimedLead) =>
    draftEdits[claim._id] || {
      subject: claim.outreach_subject || "",
      body: claim.outreach_body || "",
    };

  const generateOutreach = async (claimId: string, regenerate = false) => {
    try {
      setGeneratingIds((prev) => [...prev, claimId]);
      const { data } = await api.post("/outreach/generate", {
        claim_id: claimId,
        regenerate,
      });
      const draft = data.data;
      setDraftEdits((prev) => ({
        ...prev,
        [claimId]: { subject: draft.subject || "", body: draft.body || "" },
      }));
      setClaims((prev) =>
        prev.map((c) =>
          c._id === claimId
            ? {
                ...c,
                outreach_subject: draft.subject,
                outreach_body: draft.body,
                outreach_generated_at: draft.generated_at,
              }
            : c
        )
      );
      toast.success(regenerate ? "Draft regenerated" : "Outreach draft ready");
    } catch (error: unknown) {
      toast.error(getApiError(error, "Failed to generate outreach"));
    } finally {
      setGeneratingIds((prev) => prev.filter((id) => id !== claimId));
    }
  };

  const saveOutreachDraft = async (claimId: string) => {
    const claim = claims.find((c) => c._id === claimId);
    if (!claim) return;
    const draft = getDraft(claim);
    if (!draft.subject.trim() || !draft.body.trim()) {
      toast.error("Subject and body are required");
      return;
    }
    try {
      setSavingIds((prev) => [...prev, claimId]);
      await api.put(`/outreach/${claimId}`, draft);
      setClaims((prev) =>
        prev.map((c) =>
          c._id === claimId
            ? { ...c, outreach_subject: draft.subject, outreach_body: draft.body }
            : c
        )
      );
      toast.success("Draft saved");
    } catch (error: unknown) {
      toast.error(getApiError(error, "Failed to save draft"));
    } finally {
      setSavingIds((prev) => prev.filter((id) => id !== claimId));
    }
  };

  const copyOutreach = async (claim: ClaimedLead) => {
    const draft = getDraft(claim);
    if (!draft.subject && !draft.body) {
      toast.error("Generate a draft first");
      return;
    }
    try {
      await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  const sendOutreach = async (leadId: string, claimId: string) => {
    const claim = claims.find((c) => c._id === claimId);
    const draft = claim ? getDraft(claim) : { subject: "", body: "" };
    const subject = draft.subject.trim() || "Strategic Partnership Inquiry";
    const body =
      draft.body.trim() ||
      "Hi, I saw your post and thought we could collaborate.";
    try {
      setSendingEmailIds((prev) => [...prev, claimId]);
      const { data } = await api.post("/crm/send-email", {
        leadId,
        subject,
        body,
      });
      toast.success(data.message || "Outreach logged successfully");
      fetchClaimedLeads();
    } catch (error: unknown) {
      toast.error(getApiError(error, "Failed to send outreach"));
    } finally {
      setSendingEmailIds((prev) => prev.filter((id) => id !== claimId));
    }
  };

  const getEmailBadgeForClaim = (claim: ClaimedLead) =>
    getEmailStatusBadge(claim.leadId.contact_info?.email_status);

  const statusColors: any = {
    new: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    contacted: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    replied: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    converted: "text-green-400 bg-green-400/10 border-green-400/20",
    rejected: "text-red-400 bg-red-400/10 border-red-400/20",
    archived: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
  };

  if (authLoading || permissions.has('*')) {
    return (
      <div className="p-8 flex justify-center py-40">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hunter-orange"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center py-40">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hunter-orange"></div>
      </div>
    );
  }

  return (
    <LeadAccessGate>
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-12">
        <h1 className="text-5xl font-display font-black uppercase tracking-tighter mb-2 italic">
          Bounty <span className="text-hunter-orange underline">CRM.</span>
        </h1>
        <p className="text-zinc-500 font-display font-bold uppercase text-[10px] tracking-widest">
          Managing your claimed strategic assets and pipeline
        </p>
      </header>

      {claims.length === 0 ? (
        <div className="text-center py-32 bg-hunter-grey neo-border border-zinc-800 border-dashed">
          <LayoutDashboard size={48} className="mx-auto text-zinc-700 mb-6" />
          <p className="text-zinc-500 font-display font-black uppercase tracking-widest mb-4">
            No leads claimed yet.
          </p>
          <Button onClick={() => window.location.href = '/leads/relevant'} variant="primary" size="sm">
             Go Hunting
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {claims.map((claim) => (
            <motion.div
              key={claim._id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-hunter-grey neo-border border-zinc-800 p-6 group hover:border-hunter-orange transition-all"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Lead Profile Info */}
                <div className="lg:col-span-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center">
                       {claim.leadId.author.avatar?.url ? (
                         <img src={claim.leadId.author.avatar.url} className="w-full h-full object-cover" />
                       ) : (
                         <User size={24} className="text-zinc-600" />
                       )}
                    </div>
                    <div>
                       <h3 className="font-display font-black uppercase text-sm tracking-tight flex items-center gap-2">
                         {claim.leadId.author.name}
                         {claim.leadId.platform === 'linkedin' && <LinkedinLogo className="w-3 h-3 text-[#0A66C2]" />}
                         {claim.leadId.platform === 'twitter' && <XLogo className="w-3 h-3 text-white" />}
                       </h3>
                       <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                         {claim.leadId.platform} Lead
                       </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-hunter-black rounded border border-zinc-800 text-[11px] text-zinc-400 italic font-display mb-4 line-clamp-3">
                    "{claim.leadId.content}"
                  </div>

                  <div className="space-y-2">
                    {claim.leadId.email && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-hunter-orange uppercase tracking-tight">
                          <Mail size={12} /> {claim.leadId.email}
                          {(() => {
                            const badge = getEmailBadgeForClaim(claim);
                            return (
                              <span className={cn("px-1.5 py-0.5 text-[8px] neo-border-sm", badge.className)}>
                                {badge.label}
                              </span>
                            );
                          })()}
                        </div>
                        {formatVerifiedByLabel(claim.leadId.contact_info?.verified_by) && (
                          <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest pl-5">
                            {formatVerifiedByLabel(claim.leadId.contact_info?.verified_by)}
                          </p>
                        )}
                      </div>
                    )}
                    {claim.leadId.contact_info?.phone_numbers?.[0] && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
                        <Phone size={12} /> {claim.leadId.contact_info.phone_numbers[0].number}
                      </div>
                    )}
                    <a href={claim.leadId.url} target="_blank" className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-tight">
                      <ExternalLink size={12} /> View Source Thread
                    </a>
                  </div>
                </div>

                {/* Pipeline Controls */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  <div>
                    <label className="text-[8px] font-black uppercase text-zinc-500 mb-1 block">Pipeline Stage</label>
                    <div className="grid grid-cols-2 gap-2">
                       {['new', 'contacted', 'replied', 'converted', 'rejected', 'archived'].map((s) => (
                         <button
                           key={s}
                           onClick={() => updateStatus(claim._id, s)}
                           className={cn(
                             "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest neo-border-sm transition-all",
                             claim.status === s 
                               ? statusColors[s] 
                               : "bg-zinc-900 text-zinc-600 border-zinc-800 hover:border-zinc-700"
                           )}
                         >
                           {s}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="mt-auto space-y-2">
                    <Button
                      className="w-full h-10 text-[10px] font-black uppercase tracking-widest gap-2"
                      onClick={() => generateOutreach(claim._id, Boolean(claim.outreach_body))}
                      disabled={generatingIds.includes(claim._id)}
                      isLoading={generatingIds.includes(claim._id)}
                    >
                      <Sparkles size={14} />
                      {claim.outreach_body ? "Regenerate Draft" : "Generate Outreach"}
                    </Button>
                    <Button
                      className="w-full h-10 text-[10px] font-black uppercase tracking-widest gap-2"
                      variant="secondary"
                      onClick={() => sendOutreach(claim.leadId._id, claim._id)}
                      disabled={!claim.leadId.email || sendingEmailIds.includes(claim._id)}
                      isLoading={sendingEmailIds.includes(claim._id)}
                    >
                      <Mail size={14} /> Send Outreach
                    </Button>
                    {!claim.leadId.email && (
                      <p className="text-[8px] text-red-500/50 font-black uppercase text-center mt-1">Email address required to send</p>
                    )}
                  </div>
                </div>

                {/* Activity & Notes */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[8px] font-black uppercase text-zinc-500 block">AI Outreach Draft</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => copyOutreach(claim)}
                          className="text-zinc-500 hover:text-hunter-orange"
                          title="Copy draft"
                        >
                          <Copy size={12} />
                        </button>
                        {claim.outreach_body && (
                          <button
                            type="button"
                            onClick={() => generateOutreach(claim._id, true)}
                            className="text-zinc-500 hover:text-hunter-orange"
                            title="Regenerate"
                          >
                            <RefreshCw size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <Input
                      className="mb-2 text-[11px]"
                      placeholder="Subject"
                      value={getDraft(claim).subject}
                      onChange={(e) =>
                        setDraftEdits((prev) => ({
                          ...prev,
                          [claim._id]: { ...getDraft(claim), subject: e.target.value },
                        }))
                      }
                    />
                    <textarea
                      className="w-full bg-hunter-black neo-border border-zinc-800 p-3 text-[11px] text-white outline-none focus:border-hunter-orange transition-colors min-h-[90px]"
                      placeholder="Generate an outreach draft personalized to you and this lead..."
                      value={getDraft(claim).body}
                      onChange={(e) =>
                        setDraftEdits((prev) => ({
                          ...prev,
                          [claim._id]: { ...getDraft(claim), body: e.target.value },
                        }))
                      }
                    />
                    {claim.outreach_generated_at && (
                      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-zinc-600">
                        Generated {new Date(claim.outreach_generated_at).toLocaleString()}
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-2 h-8 w-full text-[9px] font-black uppercase tracking-widest"
                      onClick={() => saveOutreachDraft(claim._id)}
                      disabled={savingIds.includes(claim._id) || !getDraft(claim).body}
                    >
                      Save Draft
                    </Button>
                  </div>

                  <div>
                    <label className="text-[8px] font-black uppercase text-zinc-500 mb-1 block">Private Intelligence Notes</label>
                    <textarea
                      className="w-full bg-hunter-black neo-border border-zinc-800 p-3 text-[11px] text-white outline-none focus:border-hunter-orange transition-colors min-h-[70px]"
                      placeholder="Strategy notes, contact history..."
                      defaultValue={claim.notes}
                      onBlur={(e) => updateNotes(claim._id, e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-zinc-500">
                      <div className="flex items-center gap-1">
                        <Clock size={10} />
                        <span className="text-[8px] font-black uppercase tracking-tighter">
                          Claimed {new Date(claim.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      {claim.last_contacted && (
                        <div className="flex items-center gap-1 text-hunter-orange">
                          <CheckCircle2 size={10} />
                          <span className="text-[8px] font-black uppercase tracking-tighter">
                            Last Outbound: {new Date(claim.last_contacted).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    {savingIds.includes(claim._id) && (
                      <span className="text-[8px] font-black text-hunter-orange uppercase animate-pulse">Syncing...</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
    </LeadAccessGate>
  );
}
