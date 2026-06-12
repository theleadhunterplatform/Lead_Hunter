"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Search, Download, ExternalLink, MessageSquare, ThumbsUp, Share2, User, Shield, Plus, ImageIcon, Mail, Loader2, BrainCircuit, Zap } from "lucide-react";
import { Button, Input } from "@/components/ui/HunterUI";
import { cn } from "@/components/ui/HunterUI";
import api from "@/lib/api";
import ManualLeadModal from "@/components/ManualLeadModal";
import RefineLeadModal from "@/components/RefineLeadModal";
import { LinkedinLogo, XLogo, RedditLogo, ThreadsLogo } from "@/components/BrandIcons";
import { useAuth } from "@/context/AuthContext";
import ReactMarkdown from 'react-markdown';
import { toast } from "sonner";

interface Lead {
  _id: string;
  post_id: string;
  url: string;
  content: string;
  platform: 'linkedin' | 'twitter' | 'reddit' | 'threads' | 'manual';
  source?: 'scraped' | 'manual';
  image_url?: string;
  author: {
    name: string;
    handle?: string;
    url?: string;
    info?: string;
    avatar?: {
      url: string;
    };
  };
  posted_at: {
    posted_ago_text: string;
    date: string;
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  keyword: string;
  status: string;
  ai_score: number;
  is_training_data: boolean;
  email?: string;
  contact_info?: {
    name?: string;
    title?: string;
    headline?: string;
    company_name?: string;
    email_status?: string;
    linkedin_public_id?: string;
    phone_numbers?: { number: string; type: string }[];
  };
  is_claimed?: boolean;
  claimed_count: number;
  intelligence?: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);
  const [refineLead, setRefineLead] = useState<Lead | null>(null);
  const [findingEmailIds, setFindingEmailIds] = useState<string[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [claimingIds, setClaimingIds] = useState<string[]>([]);
  const { user, refreshUser, permissions } = useAuth();
  const isInternal = permissions.has('*');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'relevant' | 'irrelevant'>(isInternal ? 'all' : 'relevant');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [counts, setCounts] = useState({ all: 0, pending: 0, relevant: 0, irrelevant: 0 });

  const fetchLeads = async (page = currentPage, status = activeTab, search = searchQuery, platforms = selectedPlatforms) => {
    try {
      setIsLoading(true);
      setAccessDenied(false);

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (status !== 'all') params.append('status', status);
      if (search) params.append('search', search);
      if (platforms.length > 0) {
        params.append('platform', platforms.join(','));
      }

      const response = await api.get(`/posts?${params.toString()}`);
      const { data, total, pages, counts: backendCounts } = response.data;

      setLeads(data);
      setTotalCount(total);
      setTotalPages(pages);
      setCurrentPage(page);

      if (backendCounts) {
        setCounts(backendCounts);
      }

    } catch (error: any) {
      if (error.response?.status === 403) {
        setAccessDenied(true);
      }
      console.error("Failed to fetch leads", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrainAI = async () => {
    if (!confirm("Are you sure you want to retrain the AI model? This will use all leads marked as 'Training Data' to improve accuracy.")) return;

    try {
      setIsTraining(true);
      const response = await api.post("/ai/train");
      alert(response.data.message || "AI Model successfully retrained!");
      fetchLeads(); // Refresh leads to see if AI scores change
    } catch (error: any) {
      console.error("Failed to train AI model", error);
      alert(error.response?.data?.message || "AI Training failed. Please try again later.");
    } finally {
      setIsTraining(false);
    }
  };

  const updateLeadLabel = async (id: string, data: { status?: string; is_training_data?: boolean }) => {
    try {
      // Optimistic update
      setLeads(prev => prev.map(lead =>
        lead._id === id ? { ...lead, ...data } : lead
      ));

      await api.put(`/posts/${id}/label`, data);
    } catch (error) {
      console.error("Failed to update lead label", error);
      // Revert on error
      fetchLeads();
    }
  };

  const handleReExtract = async (id: string) => {
    try {
      // Optimistic loading state could be added if we had an isExtracting state per lead
      await api.post(`/posts/${id}/re-extract`);
      fetchLeads(); // Refresh to see new content
    } catch (error: any) {
      console.error("Failed to re-extract lead", error);
      alert(error.response?.data?.message || "AI Re-extraction failed. The image might be too complex.");
    }
  };

  const handleFindEmail = async (leadId: string) => {
    try {
      setFindingEmailIds(prev => [...prev, leadId]);
      const response = await api.post(`/posts/${leadId}/find-email`);
      
      if (response.data.success) {
        setLeads(prev => prev.map(l => l._id === leadId ? { ...l, ...response.data.data } : l));
      } else {
        alert(response.data.message || 'No contact found for this lead');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to find email');
    } finally {
      setFindingEmailIds(prev => prev.filter(id => id !== leadId));
    }
  };

  const handleClaim = async (leadId: string) => {
    try {
      setClaimingIds(prev => [...prev, leadId]);
      const response = await api.post(`/posts/${leadId}/claim`);
      
      if (response.data.success) {
        // Update local lead state
        setLeads(prev => prev.map(l => 
          l._id === leadId ? { ...l, is_claimed: true, claimed_count: (l.claimed_count || 0) + 1 } : l
        ));
        
        // Refresh user tokens
        refreshUser();
        
        toast.success("Lead claimed! View it in My CRM.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to claim lead.');
    } finally {
      setClaimingIds(prev => prev.filter(id => id !== leadId));
    }
  };

  useEffect(() => {
    fetchLeads(1, activeTab, searchQuery, selectedPlatforms);
  }, [activeTab, selectedPlatforms]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    fetchLeads(1, activeTab, searchQuery, selectedPlatforms);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchLeads(newPage, activeTab, searchQuery, selectedPlatforms);
  };

  const tabs = isInternal 
    ? [
        { id: "all", label: "Scraped Posts", count: counts.all },
        { id: "pending", label: "Pending Analysis", count: counts.pending },
        { id: "relevant", label: "Qualified Leads", count: counts.relevant },
        { id: "irrelevant", label: "Noise", count: counts.irrelevant },
      ]
    : [
        { id: "relevant", label: "Qualified Leads", count: counts.relevant },
      ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <header className="mb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h1 className="text-5xl md:text-6xl font-display font-black uppercase">
            Lead <span className="text-hunter-orange italic underline">Intelligence.</span>
          </h1>
          <div className="flex gap-4">
            <Button
              onClick={handleTrainAI}
              isLoading={isTraining}
              className={`flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 ${isTraining ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <Shield size={18} /> {isTraining ? 'Training AI...' : 'Retrain AI'}
            </Button>
            {/* <Button
              onClick={() => setIsManualModalOpen(true)}
              className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200"
            >
              <Plus size={18} /> Upload Lead
            </Button> */}
            {/* <Button variant="secondary" className="flex items-center gap-2">
              <Download size={18} /> Export
            </Button> */}
          </div>
        </div>
      </header>

      {/* Tabs System */}
      <div className="flex flex-wrap gap-2 mb-4 p-1 bg-zinc-900 neo-border border-zinc-800 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id
              ? "bg-hunter-orange text-black"
              : "text-zinc-500 hover:text-white hover:bg-zinc-800"
              }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.5 text-[8px] rounded-full ${activeTab === tab.id ? "bg-black/20" : "bg-white/10"
              }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Platform Signal Matrix - Unique Filter Concept */}


      <div className="mb-8 flex items-center gap-2">
        <div className="h-[1px] flex-1 bg-zinc-800" />
        <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
          Showing {leads.length} of {totalCount} {activeTab} posts (Page {currentPage} of {totalPages})
        </span>
        <div className="h-[1px] flex-1 bg-zinc-800" />
      </div>

      <form onSubmit={handleSearch} className="bg-hunter-grey neo-border border-zinc-800 p-6 mb-10 flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <Input
            placeholder="Search by name, keyword, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button type="submit" className="md:w-32">Search</Button>
      </form>

      {/* Leads List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-20 text-zinc-500 font-display font-black uppercase tracking-widest animate-pulse">
            Loading Posts...
          </div>
        ) : accessDenied ? (
          <div className="text-center py-20 bg-red-500/5 neo-border border-red-500/20 flex flex-col items-center">
            <Shield size={48} className="text-red-500 mb-6 opacity-50" />
            <h3 className="text-red-500 font-display font-black text-3xl uppercase tracking-tighter mb-2">Access Restricted</h3>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] max-w-xs leading-relaxed">
              You don't have permission to view posts. Please contact your team manager for access.
            </p>
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-20 bg-hunter-grey neo-border border-zinc-800 border-dashed">
            <p className="text-zinc-500 font-display font-black uppercase tracking-widest">
              No posts found matching your criteria.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {leads.map((lead, i) => (
              <motion.div
                key={lead._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="bg-hunter-grey neo-border border-zinc-800 p-4 flex flex-col hover:border-hunter-orange transition-all group"
              >
                <div className="flex items-start gap-4">
                  {/* Author Mini-Profile */}
                  <div className="w-10 h-10 bg-zinc-800 neo-border border-zinc-700 overflow-hidden flex-shrink-0 flex items-center justify-center group-hover:border-hunter-orange transition-colors">
                    {(lead.is_claimed || isInternal) && lead.author.avatar?.url ? (
                      <img src={lead.author.avatar.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={20} className="text-zinc-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-display font-black uppercase tracking-tight group-hover:text-hunter-orange transition-colors truncate">
                          {lead.author.name} {(lead.is_claimed || isInternal) && lead.author.handle && <span className="text-[10px] text-zinc-500 lowercase font-bold">@{lead.author.handle}</span>}
                        </h3>
                        {lead.platform === 'linkedin' && <LinkedinLogo className="w-3 h-3 text-[#0A66C2]" />}
                        {lead.platform === 'twitter' && <XLogo className="w-3 h-3 text-white" />}
                        {lead.platform === 'reddit' && <RedditLogo className="w-3 h-3 text-[#FF4500]" />}
                        {lead.platform === 'threads' && <ThreadsLogo className="w-3 h-3 text-white" />}

                        {lead.url && lead.url.startsWith('http') && (
                          <a href={lead.url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                            <ExternalLink size={12} />
                          </a>
                        )}
                        {lead.source === 'manual' && (
                          <div className="px-1.5 py-0.5 bg-hunter-orange/10 border border-hunter-orange/30 text-hunter-orange text-[7px] font-black uppercase tracking-widest rounded-sm">
                            Manual
                          </div>
                        )}
                      </div>
                      <div className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 text-[8px] font-black uppercase tracking-widest flex-shrink-0">
                        KW: <span className="text-hunter-orange">{lead.keyword}</span>
                      </div>
                    </div>

                    {/* Lead Intelligence - ALWAYS SHOWN if relevant */}
                    {lead.intelligence && (
                      <div className="mb-4 p-3 bg-zinc-900/50 neo-border border-zinc-800 border-l-hunter-orange border-l-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap size={12} className="text-hunter-orange" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">Lead Intelligence</span>
                        </div>
                        <div className="text-xs text-zinc-400 leading-relaxed italic prose prose-invert prose-xs max-w-none">
                          <ReactMarkdown>{lead.intelligence}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Only show post content if claimed or internal user */}
                    {(lead.is_claimed || isInternal) && (
                      <p className="text-zinc-300 text-sm leading-relaxed mb-6 font-display">
                        {lead.content}
                      </p>
                    )}

                    {lead.email || (lead.contact_info?.phone_numbers && lead.contact_info.phone_numbers.length > 0) ? (
                      <div className="mb-6 p-4 bg-hunter-orange/5 neo-border border-hunter-orange/20 relative overflow-hidden group/email">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-hunter-orange/5 -rotate-45 translate-x-8 -translate-y-8" />
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-hunter-orange/10 flex items-center justify-center neo-border border-hunter-orange/30">
                            {lead.email ? <Mail size={12} className="text-hunter-orange" /> : <MessageSquare size={12} className="text-hunter-orange" />}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-hunter-orange">
                            {lead.email ? 'Verified Contact' : 'Phone Found'}
                          </span>
                          {lead.contact_info?.email_status === 'verified' && (
                            <span className="text-[8px] px-1.5 py-0.5 bg-green-500/10 text-green-500 neo-border border-green-500/30 uppercase font-black ml-2">Verified</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {lead.email && <p className="text-lg font-display font-black text-white tracking-tight">{lead.email}</p>}
                          {lead.contact_info?.phone_numbers?.map((p: any, i: number) => (
                            <p key={i} className="text-sm font-bold text-zinc-400">{p.number}</p>
                          ))}
                          {(lead.contact_info?.title || lead.contact_info?.company_name) && (
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight mt-2">
                              {lead.contact_info.title} {lead.contact_info.company_name && `• ${lead.contact_info.company_name}`}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (lead.is_claimed || isInternal) && (lead.platform === 'linkedin' || lead.platform === 'threads') && (
                      <div className="flex flex-col gap-3 mb-6">
                        {lead.contact_info?.linkedin_public_id ? (
                          <div className="flex items-center justify-between p-3 bg-zinc-900/30 neo-border border-zinc-800">
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-zinc-500" />
                              <span className="text-xs font-black text-white tracking-tight">@{lead.contact_info.linkedin_public_id}</span>
                            </div>
                            <a 
                              href={lead.author?.url || lead.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[9px] text-hunter-orange font-black uppercase flex items-center gap-1 hover:underline"
                            >
                              View Profile <ExternalLink size={10} />
                            </a>
                          </div>
                        ) : (
                          <a 
                            href={lead.author?.url || lead.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full h-11 neo-border border-zinc-800 bg-zinc-900/50 flex items-center justify-center gap-2 text-zinc-400 hover:text-white transition-all text-[10px] font-black uppercase"
                          >
                            <ExternalLink size={14} /> Open Source Profile
                          </a>
                        )}

                        <Button
                          size="sm"
                          onClick={() => handleFindEmail(lead._id)}
                          disabled={findingEmailIds.includes(lead._id)}
                          className="w-full h-11 text-[10px] uppercase font-black bg-hunter-orange/5 text-hunter-orange border-hunter-orange/20 hover:bg-hunter-orange hover:text-black transition-all flex items-center justify-center gap-3 group/hunt"
                        >
                          {findingEmailIds.includes(lead._id) ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span>Hunting Digital Identity...</span>
                            </>
                          ) : (
                            <>
                              <Search size={16} className="group-hover/hunt:scale-110 transition-transform" />
                              <span>Find Verified Business Email</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-4">
                      {lead.image_url && (lead.is_claimed || isInternal) && (
                        <div
                          className="flex items-center gap-2 p-2 bg-black/20 neo-border border-zinc-800 w-fit cursor-pointer hover:border-zinc-600 transition-colors group/img"
                          onClick={() => {
                            const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '');
                            const cleanUrl = lead.image_url?.startsWith('/') ? lead.image_url : `/${lead.image_url}`;
                            window.open(`${baseUrl}${cleanUrl}`, '_blank');
                          }}
                        >
                          <ImageIcon size={14} className="text-zinc-500 group-hover/img:text-hunter-orange" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">View Source Image</span>
                        </div>
                      )}

                      {lead.content === "Manual Extraction Required" && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setRefineLead(lead);
                              setIsRefineModalOpen(true);
                            }}
                            className="h-8 text-[9px] font-black uppercase bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                          >
                            Manual Refine
                          </Button>
                          <Button
                            onClick={() => handleReExtract(lead._id)}
                            className="h-8 text-[9px] font-black uppercase bg-hunter-orange text-black hover:bg-hunter-orange/80"
                          >
                            Re-extract with AI
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => updateLeadLabel(lead._id, { status: 'relevant' })}
                          className={`h-7 text-[8px] uppercase font-black px-3 ${lead.status === 'relevant' ? 'bg-green-500 text-black border-green-500 hover:bg-green-600' : ''}`}
                        >
                          Relevant
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => updateLeadLabel(lead._id, { status: 'irrelevant' })}
                          className={`h-7 text-[8px] uppercase font-black px-3 ${lead.status === 'irrelevant' ? 'bg-red-500 text-black border-red-500 hover:bg-red-600' : ''}`}
                        >
                          Irrelevant
                        </Button>
                        {lead.status !== 'pending' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => updateLeadLabel(lead._id, { status: 'pending' })}
                            className="h-7 text-[8px] uppercase font-black px-3"
                          >
                            Reset
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateLeadLabel(lead._id, { is_training_data: !lead.is_training_data })}
                            className={`px-1.5 py-0.5 text-[7px] font-black uppercase tracking-tighter neo-border transition-all ${lead.is_training_data
                              ? 'bg-blue-500 text-black border-blue-500'
                              : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-500'
                              }`}
                          >
                            {lead.is_training_data ? 'Training Data' : 'Use for Training'}
                          </button>
                        </div>
                        <div className={`px-1.5 py-0.5 text-[7px] font-black uppercase tracking-tighter neo-border ${lead.status === 'relevant' ? 'bg-green-500/10 text-green-500 border-green-500/50' :
                          lead.status === 'irrelevant' ? 'bg-red-500/10 text-red-500 border-red-500/50' :
                            'bg-zinc-800 text-zinc-500 border-zinc-700'
                          }`}>
                          {lead.status || 'pending'}
                        </div>
                        {lead.status === 'relevant' && (
                          <Link href="/leads/relevant">
                            <Button 
                              size="sm" 
                              className="h-7 text-[8px] uppercase font-black px-4 bg-hunter-orange text-black border-black flex items-center gap-2"
                            >
                              <BrainCircuit size={12} /> View Intel
                            </Button>
                          </Link>
                        )}
                        {lead.status === 'relevant' && (
                          <Button 
                            size="sm" 
                            className={cn(
                              "h-7 text-[8px] uppercase font-black px-4 transition-all",
                              lead.is_claimed 
                                ? "bg-zinc-800 text-zinc-500 border-zinc-700 pointer-events-none" 
                                : "bg-white text-black hover:bg-hunter-orange hover:text-black"
                            )}
                            onClick={() => handleClaim(lead._id)}
                            disabled={claimingIds.includes(lead._id) || lead.is_claimed}
                          >
                            {claimingIds.includes(lead._id) ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : lead.is_claimed ? (
                              "Claimed"
                            ) : (
                              `Claim (${lead.claimed_count || 0}/25)`
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Pagination Controls */}
      {!isLoading && totalPages > 1 && (
        <div className="mt-12 flex justify-center items-center gap-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-24"
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {[...Array(totalPages)].map((_, i) => {
              const pageNum = i + 1;
              // Show only a few pages around current page
              if (
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 font-display font-black text-xs neo-border transition-all ${currentPage === pageNum
                      ? 'bg-hunter-orange text-black border-black'
                      : 'bg-hunter-grey text-zinc-500 border-zinc-800 hover:border-hunter-orange'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              } else if (
                pageNum === currentPage - 2 ||
                pageNum === currentPage + 2
              ) {
                return <span key={pageNum} className="text-zinc-700">...</span>;
              }
              return null;
            })}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-24"
          >
            Next
          </Button>
        </div>
      )}

      <ManualLeadModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={() => {
          fetchLeads();
          setIsManualModalOpen(false);
        }}
      />
      <RefineLeadModal
        isOpen={isRefineModalOpen}
        onClose={() => setIsRefineModalOpen(false)}
        onSuccess={fetchLeads}
        lead={refineLead}
      />
    </div>
  );
}
