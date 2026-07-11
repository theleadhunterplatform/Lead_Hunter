"use client";

import { LinkedinLogo, RedditLogo, ThreadsLogo, XLogo } from "@/components/BrandIcons";
import { Button } from "@/components/ui/HunterUI";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_ROUTES } from "@/lib/routes";
import api from "@/lib/api";
import { applyClaimResponseToLead } from "@/lib/claim-reveal";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowUpRight,
    BrainCircuit,
    CheckCircle2,
    ChevronRight,
    FileText,
    Loader2,
    Mail,
    Phone,
    Shield,
    Sparkles,
    Target,
    User,
    Zap
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

interface Lead {
  _id: string;
  post_id: string;
  url: string;
  content: string;
  platform: 'linkedin' | 'twitter' | 'reddit' | 'threads' | 'manual';
  author: {
    name: string;
    handle?: string;
    url?: string;
    avatar?: { url: string };
  };
  posted_at: {
    date: string;
  };
  keyword: string;
  status: string;
  email?: string;
  enrichment_status?: 'pending' | 'searching' | 'found' | 'partial' | 'not_found' | 'skipped' | 'failed' | null;
  enrichment_message?: string | null;
  contact_info?: {
    name?: string;
    title?: string;
    headline?: string;
    company_name?: string;
    email_status?: string;
    email_source?: string;
    phone_numbers?: { number: string; type: string }[];
  };
  intelligence?: string;
  has_intelligence?: boolean;
  is_claimed?: boolean;
}

import ReactMarkdown from 'react-markdown';
import { LeadAccessGate } from "@/components/LeadAccessGate";

export default function StrategicLeadsPage() {
  const router = useRouter();
  const { refreshUser, permissions, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const leadFromUrl = searchParams.get("lead");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [claimingIds, setClaimingIds] = useState<string[]>([]);

  const isInternal = permissions.has('*');

  useEffect(() => {
    if (authLoading) return;
    if (isInternal) router.replace(ADMIN_ROUTES.leadIntelligence);
  }, [authLoading, isInternal, router]);

  const handleClaim = async (leadId: string) => {
    try {
      setClaimingIds(prev => [...prev, leadId]);
      const response = await api.post(`/posts/${leadId}/claim`);
      
      if (response.data.success) {
        setLeads(prev => prev.map(l => 
          l._id === leadId ? applyClaimResponseToLead(l, response.data) : l
        ));
        
        refreshUser();
        
        toast.success("Lead claimed! Contact details unlocked.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to claim lead.');
    } finally {
      setClaimingIds(prev => prev.filter(id => id !== leadId));
    }
  };

  const fetchStrategicLeads = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const response = await api.get("/posts?status=approved&limit=50");
      let nextLeads: Lead[] = response.data.data || [];

      if (leadFromUrl && !nextLeads.some((l) => l._id === leadFromUrl)) {
        try {
          const one = await api.get(`/posts/${leadFromUrl}`);
          if (one.data?.data) {
            nextLeads = [one.data.data, ...nextLeads];
          }
        } catch {
          // lead may not exist or not accessible
        }
      }

      setLeads(nextLeads);

      if (leadFromUrl && nextLeads.some((l) => l._id === leadFromUrl)) {
        setSelectedLeadId(leadFromUrl);
      } else if (nextLeads.length > 0) {
        setSelectedLeadId((current) => current || nextLeads[0]._id);
      }
    } catch (error) {
      console.error("Failed to fetch strategic leads", error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [leadFromUrl]);

  useEffect(() => {
    fetchStrategicLeads();
    const interval = setInterval(() => fetchStrategicLeads(true), 15000);
    return () => clearInterval(interval);
  }, [fetchStrategicLeads]);

  const selectedLead = leads.find(l => l._id === selectedLeadId);

  const getEmailLabel = (lead: Lead) => {
    if (!isInternal && !lead.is_claimed) return "Claim lead to unlock";
    if (lead.email) {
      const status = lead.contact_info?.email_status;
      if (status === 'verified') return lead.email;
      return "No verified email found yet";
    }
    if (lead.enrichment_status === 'searching') return "Searching...";
    if (lead.enrichment_status === 'not_found' || lead.enrichment_status === 'skipped') return "No email found";
    if (lead.enrichment_status === 'partial') return lead.enrichment_message || "Profile found — no email";
    return "Not searched yet";
  };

  // Simple Markdown to HTML parser for the intelligence content
  const formatIntelligence = (content: string) => {
    if (!content) return null;
    
    return content.split('\n').map((line, i) => {
      if (line.startsWith('# **')) {
        return <h2 key={i} className="text-2xl font-black text-hunter-orange mt-6 mb-4 uppercase italic underline">{line.replace(/# \*\*|\*\*/g, '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-black text-white mt-6 mb-2 uppercase tracking-tight flex items-center gap-2">
          <ChevronRight size={16} className="text-hunter-orange" />
          {line.replace('### ', '')}
        </h3>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={i} className="text-xl font-black text-white mt-8 mb-4 border-b-2 border-zinc-800 pb-2 uppercase tracking-tighter">
          {line.replace('## ', '')}
        </h3>;
      }
      if (line.startsWith('* ') || line.startsWith('- ')) {
        return <div key={i} className="flex gap-3 mb-2 ml-4">
          <div className="w-1.5 h-1.5 bg-hunter-orange mt-2 flex-shrink-0" />
          <p className="text-zinc-300 font-medium">{line.substring(2)}</p>
        </div>;
      }
      if (line.startsWith('> ')) {
        return <blockquote key={i} className="border-l-4 border-hunter-orange bg-hunter-orange/5 p-4 my-4 italic text-zinc-300 font-medium">
          {line.replace('> ', '')}
        </blockquote>;
      }
      if (line.trim() === '') return <div key={i} className="h-2" />;
      
      // Bold text handling
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return <p key={i} className="mb-4 text-zinc-400 leading-relaxed">
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <span key={j} className="text-white font-black">{part.replace(/\*\*/g, '')}</span>;
          }
          return part;
        })}
      </p>;
    });
  };

  return (
    <LeadAccessGate>
    <div className="flex h-full overflow-hidden bg-hunter-black">
      {/* Sidebar List */}
      <div className="w-96 border-r-2 border-zinc-900 flex flex-col bg-hunter-black flex-shrink-0">
        <div className="p-6 border-b-2 border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-2 text-hunter-orange font-black uppercase text-xs tracking-widest">
            <Shield size={14} /> Strategic Leads
          </div>
          <span className="bg-hunter-orange text-black px-2 py-0.5 text-[10px] font-black">{leads.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="p-10 text-center flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-zinc-700" />
              <span className="text-[10px] font-black uppercase text-zinc-700 tracking-widest">Scanning Intel...</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center gap-4">
              <Target size={32} className="text-zinc-800" />
              <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest leading-relaxed">
                No claimable leads yet
              </span>
              <p className="text-[11px] text-zinc-500 leading-relaxed max-w-[220px]">
                Leads show here after they are scraped, enriched, approved, and given intelligence. Check back soon or ask your admin.
              </p>
            </div>
          ) : (
            leads.map(lead => (
              <button
                key={lead._id}
                onClick={() => setSelectedLeadId(lead._id)}
                className={`w-full text-left p-6 border-b border-zinc-900 transition-all hover:bg-hunter-grey group ${selectedLeadId === lead._id ? 'bg-hunter-grey border-l-4 border-l-hunter-orange' : ''}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-zinc-800 neo-border border-zinc-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {(lead.is_claimed || isInternal) && lead.author.avatar?.url ? (
                      <img src={lead.author.avatar.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={14} className="text-zinc-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={`text-sm font-black uppercase tracking-tight truncate ${selectedLeadId === lead._id ? 'text-hunter-orange' : 'text-white'}`}>
                      {lead.author.name}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase">{lead.platform}</span>
                      <div className="w-1 h-1 bg-zinc-700 rounded-full" />
                      <span className="text-[9px] text-zinc-500 font-bold uppercase">{new Date(lead.posted_at.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {lead.platform === 'linkedin' && <LinkedinLogo className="w-3 h-3 text-[#0A66C2]" />}
                  {lead.platform === 'twitter' && <XLogo className="w-3 h-3 text-white" />}
                  {lead.platform === 'reddit' && <RedditLogo className="w-3 h-3 text-[#FF4500]" />}
                  {lead.platform === 'threads' && <ThreadsLogo className="w-3 h-3 text-white" />}
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed font-medium">
                  {lead.content}
                </p>
                {lead.intelligence ? (
                  <div className="mt-3 flex items-center gap-2 text-green-500 text-[8px] font-black uppercase tracking-widest">
                    <BrainCircuit size={10} /> Intelligence Ready
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 text-hunter-orange text-[8px] font-black uppercase tracking-widest">
                    <Loader2 size={10} className="animate-spin" /> Report Generating
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Detail Area */}
      <div className="flex-1 overflow-y-auto bg-hunter-black relative">
        <AnimatePresence mode="wait">
          {!selectedLead ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="h-full flex flex-col items-center justify-center p-20 text-center"
            >
              <div className="w-20 h-20 bg-zinc-900 neo-border border-zinc-800 flex items-center justify-center mb-6">
                <BrainCircuit size={40} className="text-zinc-700" />
              </div>
              <h2 className="text-2xl font-black uppercase text-zinc-500 tracking-tighter mb-2">Lead Intelligence Engine</h2>
              <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest max-w-sm leading-relaxed">
                Select a relevant lead from the sidebar to view strategic breakdown and contact details.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={selectedLead._id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-10 max-w-5xl mx-auto"
            >
              <header className="mb-12">
                <div className="flex items-start justify-between gap-10">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="px-3 py-1 bg-hunter-orange text-black font-black text-[10px] uppercase tracking-widest italic flex items-center gap-2">
                        <Sparkles size={12} /> High Quality Lead
                      </div>
                      <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                        Captured from {selectedLead.platform}
                      </div>
                    </div>
                    <h1 className="text-5xl font-black uppercase tracking-tighter text-white mb-2 leading-none">
                      {selectedLead.author.name}
                    </h1>
                    <p className="text-xl font-display font-bold text-zinc-500 italic">
                      {selectedLead.contact_info?.headline || selectedLead.contact_info?.title || "Strategic Lead Identity"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {selectedLead.is_claimed ? (
                      <div className="flex flex-col items-end gap-2">
                        <div className="px-4 py-2 bg-green-500/10 border-2 border-green-500 text-green-500 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 size={16} /> Lead Claimed
                        </div>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          className="w-full text-[10px]"
                          onClick={() => window.location.href = '/crm'}
                        >
                          View in CRM
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="primary" 
                        className="flex items-center gap-3 bg-hunter-orange text-black hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)] disabled:opacity-50 disabled:hover:scale-100"
                        onClick={() => handleClaim(selectedLead._id)}
                        disabled={claimingIds.includes(selectedLead._id) || !(selectedLead.has_intelligence || selectedLead.intelligence)}
                        title={!(selectedLead.has_intelligence || selectedLead.intelligence) ? "Strategic report is still generating" : undefined}
                      >
                        {claimingIds.includes(selectedLead._id) ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Zap size={18} />
                        )}
                        {!selectedLead.intelligence
                          ? "Report Generating — Claim Soon"
                          : "Claim Lead to Unlock Contact"}
                      </Button>
                    )}
                    <Button 
                      variant="secondary" 
                      className="flex items-center gap-3 border-zinc-800"
                      onClick={() => selectedLead.url !== '#' && window.open(selectedLead.url, '_blank')}
                      disabled={selectedLead.url === '#'}
                    >
                      {selectedLead.url === '#' ? "Signal Locked" : "Original Signal"} 
                      <ArrowUpRight size={18} />
                    </Button>
                  </div>
                </div>
              </header>

              <div className="grid grid-cols-3 gap-10">
                {/* Left Column: Original Post & Contact */}
                <div className="col-span-1 space-y-8">
                  {(selectedLead.is_claimed || isInternal) && (
                    <section>
                      <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <FileText size={14} /> Original Signal
                      </h4>
                      <div className="bg-hunter-grey neo-border border-zinc-800 p-6">
                        <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                          "{selectedLead.content}"
                        </p>
                      </div>
                    </section>
                  )}

                  <section>
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <User size={14} /> Identity Details
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800">
                        <div className="w-10 h-10 bg-hunter-orange/10 flex items-center justify-center text-hunter-orange">
                          <Mail size={20} />
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">Email Address</p>
                          <p className="text-sm font-bold text-white">{getEmailLabel(selectedLead)}</p>
                        </div>
                      </div>

                      {selectedLead.contact_info?.phone_numbers?.map((p, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800">
                          <div className="w-10 h-10 bg-hunter-orange/10 flex items-center justify-center text-hunter-orange">
                            <Phone size={20} />
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">{p.type} Phone</p>
                            <p className="text-sm font-bold text-white">{p.number}</p>
                          </div>
                        </div>
                      ))}

                      {selectedLead.contact_info?.company_name && (
                        <div className="p-4 bg-zinc-900 border border-zinc-800">
                          <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">Organization</p>
                          <p className="text-sm font-bold text-white underline decoration-hunter-orange underline-offset-4 decoration-2">{selectedLead.contact_info.company_name}</p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                {/* Right Column: AI Intelligence */}
                <div className="col-span-2">
                  <section className="bg-zinc-950 neo-border border-hunter-orange/20 p-10 relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-hunter-orange/5 rounded-full blur-[100px]" />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px]" />

                    <div className="relative">
                      <div className="flex items-center gap-3 mb-10 border-b-2 border-zinc-900 pb-6">
                        <div className="w-12 h-12 bg-hunter-orange flex items-center justify-center text-black">
                          <BrainCircuit size={28} />
                        </div>
                        <div>
                          <h2 className="text-3xl font-black uppercase tracking-tight text-white leading-none">Strategic Intel</h2>
                          <p className="text-[10px] font-black uppercase text-hunter-orange tracking-widest mt-1 italic">Generated via Lead Hunter AI</p>
                        </div>
                      </div>

                      {selectedLead.intelligence ? (
                        <div className="prose prose-invert prose-orange max-w-none">
                          <ReactMarkdown>{selectedLead.intelligence}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="py-20 text-center flex flex-col items-center gap-6">
                          <div className="w-16 h-16 border-2 border-dashed border-zinc-800 flex items-center justify-center rounded-full">
                            <BrainCircuit size={32} className="text-zinc-800" />
                          </div>
                          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest leading-relaxed max-w-md">
                            Strategic report is still being generated.
                            This lead is visible here — refresh in a moment, then you can claim it.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </LeadAccessGate>
  );
}
