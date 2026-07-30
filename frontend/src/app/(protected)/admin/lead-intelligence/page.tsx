"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Search, Download, ExternalLink, MessageSquare, ThumbsUp, Share2, User, Shield, Plus, ImageIcon, Mail, Loader2, BrainCircuit, Zap, RefreshCw, CheckCircle2, XCircle, ClipboardCheck, Trash2, ClipboardPaste } from "lucide-react";
import { Button, Input } from "@/components/ui/HunterUI";
import { cn } from "@/components/ui/HunterUI";
import api from "@/lib/api";
import { applyClaimResponseToLead } from "@/lib/claim-reveal";
import ManualLeadModal from "@/components/ManualLeadModal";
import ManualContactModal from "@/components/ManualContactModal";
import RefineLeadModal from "@/components/RefineLeadModal";
import { LinkedinLogo, XLogo, RedditLogo, ThreadsLogo } from "@/components/BrandIcons";
import { useAuth } from "@/context/AuthContext";
import ReactMarkdown from 'react-markdown';
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getApiError } from "@/lib/errors";
import {
  formatVerifiedByLabel,
  getEmailStatusBadge,
} from "@/lib/email-verification";

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
  qualification_reason?: string;
  enrichment_status?: 'pending' | 'searching' | 'found' | 'partial' | 'not_found' | 'skipped' | 'failed' | null;
  enrichment_message?: string | null;
  enriched_at?: string | null;
  is_training_data: boolean;
  email?: string;
  contact_info?: {
    name?: string;
    title?: string;
    headline?: string;
    company_name?: string;
    email_status?: string;
    email_source?: string;
    found_by?: string[];
    verified_by?: string[];
    find_note?: string;
    verification_note?: string;
    email_verified_at?: string;
    linkedin_public_id?: string;
    phone_numbers?: { number: string; type: string }[];
    emails?: LeadEmailEntry[];
    email_conflict?: boolean;
  };
  is_claimed?: boolean;
  claimed_count: number;
  intelligence?: string;
  review_status?: 'awaiting_review' | 'approved' | 'rejected' | null;
  reviewed_at?: string | null;
  reviewed_by_id?: string | null;
  reviewed_by_name?: string | null;
}

interface LeadEmailEntry {
  email: string;
  found_by?: string[];
  email_status?: string;
  email_source?: string;
  find_note?: string;
  verification_note?: string;
  verified_by?: string[];
  is_primary?: boolean;
}

export default function LeadIntelligencePage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isManualContactOpen, setIsManualContactOpen] = useState(false);
  const [manualContactLead, setManualContactLead] = useState<Lead | null>(null);
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);
  const [refineLead, setRefineLead] = useState<Lead | null>(null);
  const [claimingIds, setClaimingIds] = useState<string[]>([]);
  const [bulkReanalysing, setBulkReanalysing] = useState(false);
  const [reanalysePolling, setReanalysePolling] = useState(false);
  const [bulkReenriching, setBulkReenriching] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkRejecting, setBulkRejecting] = useState(false);
  const [enrichingIds, setEnrichingIds] = useState<string[]>([]);
  const [reviewActionIds, setReviewActionIds] = useState<string[]>([]);
  const [intelActionIds, setIntelActionIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkSelectionBusy, setBulkSelectionBusy] = useState(false);
  const [aiMetrics, setAiMetrics] = useState<{
    accuracy: number | null;
    samples: number;
    relevant_count: number;
    irrelevant_count: number;
    model_ready: boolean;
    status: string;
    message?: string;
  } | null>(null);
  const [leadStats, setLeadStats] = useState<{
    qualified_today: number;
    qualified_total: number;
    scraped_today: number;
    scraped_total: number;
    pending: number;
    with_email: number;
    awaiting_review: number;
    with_contact: number;
    watchlist_active: number;
  } | null>(null);
  const { user, refreshUser, permissions, loading: authLoading } = useAuth();
  const isInternal = permissions.has('*');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'irrelevant' | 'relevant' | 'with_contact' | 'approved' | 'pending' | 'review'>('relevant');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [counts, setCounts] = useState({
    all: 0,
    irrelevant: 0,
    relevant: 0,
    with_contact: 0,
    approved: 0,
    pending: 0,
    review: 0,
  });
  const [isTrainingAi, setIsTrainingAi] = useState(false);
  const [intelConfigured, setIntelConfigured] = useState<boolean | null>(null);
  const [intelModel, setIntelModel] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;
    if (!isInternal) router.replace("/leads/relevant");
  }, [authLoading, isInternal, router]);

  useEffect(() => {
    if (!isInternal) return;
    api
      .get("/settings/intelligence")
      .then(({ data }) => {
        setIntelConfigured(Boolean(data.data?.is_configured));
        setIntelModel(data.data?.model || "");
      })
      .catch(() => setIntelConfigured(false));
  }, [isInternal]);

  const fetchAiMetrics = async () => {
    if (!isInternal) return;
    try {
      const response = await api.get("/ai/metrics");
      setAiMetrics(response.data.data);
    } catch (error) {
      console.error("Failed to fetch AI metrics", error);
    }
  };

  const fetchLeadStats = async () => {
    if (!isInternal) return;
    try {
      const response = await api.get("/posts/stats");
      setLeadStats(response.data.data);
    } catch (error) {
      console.error("Failed to fetch lead stats", error);
    }
  };

  const fetchLeads = async (
    page = currentPage,
    status = activeTab,
    search = searchQuery,
    platforms = selectedPlatforms,
    silent = false
  ) => {
    try {
      if (!silent) setIsLoading(true);
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
      if (!silent) setIsLoading(false);
      fetchAiMetrics();
      fetchLeadStats();
    }
  };

  const updateLeadLabel = async (id: string, data: { status?: string; is_training_data?: boolean }) => {
    try {
      // Optimistic update
      setLeads(prev => prev.map(lead =>
        lead._id === id ? { ...lead, ...data } : lead
      ));

      await api.put(`/posts/${id}/label`, data);
      setTimeout(() => fetchAiMetrics(), 10000);
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

  const getBulkFilters = () => ({
    status: activeTab,
    search: searchQuery || undefined,
    platform: selectedPlatforms.length ? selectedPlatforms.join(',') : undefined,
  });

  const handleBulkReanalyse = async () => {
    try {
      setBulkReanalysing(true);
      const response = await api.post('/posts/bulk-reanalyse', getBulkFilters());
      const queued = response.data.queued ?? 0;
      if (queued > 0) {
        toast.success(`${queued} lead(s) queued for re-analysis. Watch the Pending tab while they process.`);
        setReanalysePolling(true);
        setActiveTab('pending');
      } else {
        toast.info(response.data.message || 'No leads matched the current filters.');
      }
      fetchLeads(1, 'pending', searchQuery, selectedPlatforms, true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to queue bulk re-analysis.');
    } finally {
      setBulkReanalysing(false);
    }
  };

  const handleBulkReEnrich = async () => {
    try {
      setBulkReenriching(true);
      const response = await api.post('/posts/bulk-re-enrich', getBulkFilters());
      if (response.data.queued > 0) {
        toast.success(response.data.message || 'Bulk re-enrichment queued.');
      } else {
        toast.info(response.data.message || 'No enrichable leads matched the current filters.');
      }
      fetchLeads(currentPage, activeTab, searchQuery, selectedPlatforms, true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to queue bulk re-enrichment.');
    } finally {
      setBulkReenriching(false);
    }
  };

  const handleReEnrichLead = async (leadId: string) => {
    try {
      setEnrichingIds((prev) => [...prev, leadId]);
      const response = await api.post(`/posts/${leadId}/re-enrich`);
      toast.success(response.data.message || 'Enrichment queued.');
      fetchLeads(currentPage, activeTab, searchQuery, selectedPlatforms, true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to queue enrichment.');
    } finally {
      setEnrichingIds((prev) => prev.filter((id) => id !== leadId));
    }
  };

  const handleApproveReview = async (leadId: string) => {
    try {
      setReviewActionIds((prev) => [...prev, leadId]);
      const response = await api.post(`/posts/${leadId}/approve`);
      toast.success(response.data.message || 'Lead approved for release.');
      fetchLeads(currentPage, activeTab, searchQuery, selectedPlatforms, true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve lead.');
    } finally {
      setReviewActionIds((prev) => prev.filter((id) => id !== leadId));
    }
  };

  const handleRejectReview = async (leadId: string) => {
    try {
      setReviewActionIds((prev) => [...prev, leadId]);
      const response = await api.post(`/posts/${leadId}/reject-review`);
      toast.success(response.data.message || 'Lead rejected.');
      fetchLeads(currentPage, activeTab, searchQuery, selectedPlatforms, true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject lead.');
    } finally {
      setReviewActionIds((prev) => prev.filter((id) => id !== leadId));
    }
  };

  const handleRegenerateIntel = async (leadId: string) => {
    try {
      setIntelActionIds((prev) => [...prev, leadId]);
      const response = await api.post(`/posts/${leadId}/generate-intelligence`);
      toast.success(response.data.message || 'Intelligence generation started.');
      fetchLeads(currentPage, activeTab, searchQuery, selectedPlatforms, true);
    } catch (err: any) {
      toast.error(getApiError(err, "Failed to generate intelligence."));
    } finally {
      setIntelActionIds((prev) => prev.filter((id) => id !== leadId));
    }
  };

  const handleDeleteLead = async (lead: Lead) => {
    const label = lead.author?.name || lead.keyword || 'this lead';
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;

    try {
      setDeletingIds((prev) => [...prev, lead._id]);
      await api.delete(`/posts/${lead._id}`);
      toast.success('Lead deleted.');
      setLeads((prev) => prev.filter((l) => l._id !== lead._id));
      setSelectedLeadIds((prev) => prev.filter((id) => id !== lead._id));
      fetchLeadStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete lead.');
    } finally {
      setDeletingIds((prev) => prev.filter((id) => id !== lead._id));
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const allPageSelected = leads.length > 0 && leads.every((lead) => selectedLeadIds.includes(lead._id));

  const toggleSelectAllPage = () => {
    const pageIds = leads.map((lead) => lead._id);
    if (allPageSelected) {
      setSelectedLeadIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedLeadIds((prev) => [...new Set([...prev, ...pageIds])]);
    }
  };

  const handleBulkApproveSelected = async () => {
    if (selectedLeadIds.length === 0) return;
    try {
      setBulkSelectionBusy(true);
      const response = await api.post('/posts/bulk-approve-selected', { ids: selectedLeadIds });
      toast.success(response.data.message || 'Selected leads approved.');
      setSelectedLeadIds([]);
      fetchLeads(currentPage, activeTab, searchQuery, selectedPlatforms, true);
      fetchLeadStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve selected leads.');
    } finally {
      setBulkSelectionBusy(false);
    }
  };

  const handleBulkDeleteSelected = async () => {
    if (selectedLeadIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedLeadIds.length} selected lead(s)? This cannot be undone.`)) return;

    try {
      setBulkSelectionBusy(true);
      const response = await api.post('/posts/bulk-delete', { ids: selectedLeadIds });
      toast.success(response.data.message || 'Selected leads deleted.');
      setSelectedLeadIds([]);
      fetchLeads(currentPage, activeTab, searchQuery, selectedPlatforms, true);
      fetchLeadStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete selected leads.');
    } finally {
      setBulkSelectionBusy(false);
    }
  };

  const handleBulkApprove = async () => {
    try {
      setBulkApproving(true);
      const response = await api.post('/posts/bulk-approve', getBulkFilters());
      if (response.data.approved > 0) {
        toast.success(response.data.message || 'Bulk approval complete.');
      } else if (response.data.skipped > 0) {
        toast.info(response.data.message || 'No leads with contact details to approve.');
      } else {
        toast.info(response.data.message || 'No leads awaiting review matched the current filters.');
      }
      fetchLeads(currentPage, activeTab, searchQuery, selectedPlatforms, true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to bulk approve leads.');
    } finally {
      setBulkApproving(false);
    }
  };

  const handleBulkReject = async () => {
    try {
      setBulkRejecting(true);
      const response = await api.post('/posts/bulk-reject', getBulkFilters());
      if (response.data.rejected > 0) {
        toast.success(response.data.message || 'Bulk rejection complete.');
      } else {
        toast.info(response.data.message || 'No leads awaiting review matched the current filters.');
      }
      fetchLeads(currentPage, activeTab, searchQuery, selectedPlatforms, true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to bulk reject leads.');
    } finally {
      setBulkRejecting(false);
    }
  };

  const handleTrainAi = async () => {
    try {
      setIsTrainingAi(true);
      const response = await api.post('/ai/train-now');
      setAiMetrics(response.data.data);
      toast.success(response.data.data?.message || 'AI training complete.');
      fetchAiMetrics();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'AI training failed. Ensure the Python AI service is running.');
    } finally {
      setIsTrainingAi(false);
    }
  };

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

  useEffect(() => {
    if (!isInternal) return;
    fetchLeads(1, activeTab, searchQuery, selectedPlatforms);
    setSelectedLeadIds([]);
  }, [activeTab, selectedPlatforms, isInternal]);

  useEffect(() => {
    if (!isInternal) return;
    fetchAiMetrics();
    fetchLeadStats();
    const interval = setInterval(() => {
      fetchAiMetrics();
      fetchLeadStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [isInternal]);

  useEffect(() => {
    if (!isInternal) return;
    const hasSearching = leads.some((lead) => lead.enrichment_status === 'searching');
    if (!hasSearching) return;

    const interval = setInterval(() => {
      fetchLeads(currentPage, activeTab, searchQuery, selectedPlatforms, true);
    }, 8000);

    return () => clearInterval(interval);
  }, [leads, currentPage, activeTab, searchQuery, selectedPlatforms]);

  useEffect(() => {
    if (!isInternal) return;
    const awaitingIntel = leads.some(
      (lead) => lead.review_status === 'approved' && !lead.intelligence
    );
    if (!awaitingIntel) return;

    const interval = setInterval(() => {
      fetchLeads(currentPage, activeTab, searchQuery, selectedPlatforms, true);
    }, 6000);

    return () => clearInterval(interval);
  }, [leads, currentPage, activeTab, searchQuery, selectedPlatforms]);

  useEffect(() => {
    if (!isInternal) return;
    const shouldPoll = reanalysePolling || counts.pending > 0;
    if (!shouldPoll) return;

    const interval = setInterval(() => {
      fetchLeads(currentPage, activeTab, searchQuery, selectedPlatforms, true);
    }, 4000);

    return () => clearInterval(interval);
  }, [reanalysePolling, counts.pending, currentPage, activeTab, searchQuery, selectedPlatforms]);

  useEffect(() => {
    if (!isInternal) return;
    if (!reanalysePolling || counts.pending > 0) return;
    setReanalysePolling(false);
    toast.info('Re-analysis finished. Check Relevant or Noise for results.');
  }, [reanalysePolling, counts.pending]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    fetchLeads(1, activeTab, searchQuery, selectedPlatforms);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchLeads(newPage, activeTab, searchQuery, selectedPlatforms);
  };

  const renderEmailBadge = (status?: string, source?: string) => {
    const badge = getEmailStatusBadge(status, source);
    return (
      <span className={cn("text-[8px] px-1.5 py-0.5 neo-border uppercase font-black", badge.className)}>
        {badge.label}
      </span>
    );
  };

  const formatFoundBy = (foundBy?: string[]) => {
    if (!foundBy?.length) return null;
    const labels: Record<string, string> = {
      contact_compass: 'Contact Compass',
      hunter_finder: 'Hunter.io',
      contactout: 'ContactOut',
      apollo: 'Apollo.io',
    };
    return foundBy.map((s) => labels[s] || s).join(' + ');
  };

  const isRedundantEmailNote = (note?: string) => {
    if (!note) return true;
    return /^Found by /i.test(note) || /^Verified by /i.test(note);
  };

  const getLeadEmailEntries = (lead: Lead): LeadEmailEntry[] => {
    if (lead.contact_info?.emails?.length) {
      return lead.contact_info.emails;
    }
    if (lead.email) {
      return [{
        email: lead.email,
        found_by: lead.contact_info?.found_by,
        email_status: lead.contact_info?.email_status,
        email_source: lead.contact_info?.email_source,
        find_note: lead.contact_info?.find_note,
        verification_note: lead.contact_info?.verification_note,
        verified_by: lead.contact_info?.verified_by,
        is_primary: true,
      }];
    }
    return [];
  };

  const canEnrichLead = (lead: Lead) =>
    lead.status === 'relevant' &&
    ['linkedin', 'threads', 'twitter', 'reddit'].includes(lead.platform);

  const getEnrichButtonLabel = (lead: Lead) => {
    if (!lead.enrichment_status || lead.enrichment_status === 'pending') return 'Find Contacts';
    return 'Re-enrich';
  };

  const leadHasDiscoverableContact = (lead: Lead) => {
    if (lead.email?.trim()) return true;
    if (lead.contact_info?.emails?.some((e) => e.email?.trim())) return true;
    if (lead.contact_info?.phone_numbers?.some((p) => p.number?.trim())) return true;
    return false;
  };

  const leadHasContactDetails = (lead: Lead) =>
    (lead.enrichment_status === 'found' || lead.enrichment_status === 'partial') &&
    leadHasDiscoverableContact(lead);

  const leadCanBulkApprove = (lead: Lead) =>
    lead.status === 'relevant' &&
    lead.review_status === 'awaiting_review' &&
    leadHasContactDetails(lead);

  // Readiness check for approved leads shown to users
  const getLeadReadiness = (lead: Lead): { ready: boolean; reasons: string[] } => {
    const reasons: string[] = [];
    const hasIntel = Boolean(lead.intelligence);
    const hasContact = leadHasDiscoverableContact(lead);

    if (!hasIntel) reasons.push('Intelligence report not generated yet');
    if (!hasContact) reasons.push('No contact details found (email or phone)');

    return { ready: hasIntel && hasContact, reasons };
  };

  const selectedApprovableCount = leads.filter(
    (lead) => selectedLeadIds.includes(lead._id) && leadCanBulkApprove(lead)
  ).length;

  const getEnrichmentStatusLabel = (status: NonNullable<Lead['enrichment_status']>) => {
    switch (status) {
      case 'found':
        return 'Found (verified)';
      case 'partial':
        return 'Partial (found, not verified)';
      case 'not_found':
        return 'Not found';
      case 'pending':
        return 'Not started';
      default:
        return status.replace(/_/g, ' ');
    }
  };

  const getEmailSourceLabel = (source?: string) => {
    const labels: Record<string, string> = {
      post_text: 'From post',
      apify_profile: 'LinkedIn profile',
      contact_compass: 'Contact Compass',
      hunter_finder: 'Hunter.io',
      compass_and_hunter: 'Contact Compass + Hunter.io',
      pattern_guess: 'Pattern guess',
      threads_profile: 'Threads profile',
      contactout: 'ContactOut',
      apollo: 'Apollo.io',
      website: 'Company website',
      author_info: 'LinkedIn author info',
      google_maps: 'Google Maps',
      manual: 'Manual entry',
      twitter_profile: 'X profile',
      reddit_profile: 'Reddit profile',
    };
    return source ? labels[source] || source : null;
  };

  const tabs = isInternal
    ? [
        { id: "all", label: "All Leads", count: counts.all },
        { id: "irrelevant", label: "Noise", count: counts.irrelevant },
        { id: "pending", label: "Needs Review", count: counts.pending },
        { id: "relevant", label: "Relevant", count: counts.relevant },
        { id: "with_contact", label: "Contact Found", count: counts.with_contact },
        { id: "review", label: "Awaiting Approval", count: counts.review },
        { id: "approved", label: "Approved", count: counts.approved },
      ]
    : [
        { id: "approved", label: "Qualified Leads", count: counts.approved },
      ];

  if (authLoading || !isInternal) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-hunter-orange animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <header className="mb-8">
        <div className="flex flex-col gap-6">
          <h1 className="text-5xl md:text-6xl font-display font-black uppercase">
            Lead <span className="text-hunter-orange italic underline">Intelligence.</span>
          </h1>

          {intelConfigured === false && (
            <div className="p-4 bg-red-500/10 border-2 border-red-500/50 neo-border">
              <p className="text-red-400 text-xs font-black uppercase tracking-widest mb-2">
                OpenRouter API not configured
              </p>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Strategic reports cannot be generated until you set{" "}
                <code className="text-hunter-orange">OPEN_ROUTER_API</code> in{" "}
                <code className="text-hunter-orange">backend/.env</code> and restart the backend.
                Get a key at{" "}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-hunter-orange underline"
                >
                  openrouter.ai/keys
                </a>
                {intelModel ? ` (model: ${intelModel})` : ""}.
              </p>
            </div>
          )}

          {isInternal && leadStats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-5xl">
              {[
                { label: "All Leads", value: leadStats.scraped_total ?? counts.all, sub: "total ingested" },
                { label: "Relevant", value: counts.relevant, sub: "AI-qualified leads" },
                { label: "Contact Found", value: leadStats.with_contact ?? counts.with_contact, sub: "partial or verified" },
                { label: "Awaiting Approval", value: leadStats.awaiting_review ?? counts.review, sub: "needs sign-off", highlight: true },
                { label: "Approved", value: counts.approved, sub: "released to clients" },
              ].map((stat) => (
                <div key={stat.label} className={cn(
                  "p-4 bg-hunter-grey neo-border border-zinc-800",
                  stat.highlight && (stat.value as number) > 0 && "border-hunter-orange/40 border-l-4 border-l-hunter-orange"
                )}>
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">{stat.label}</p>
                  <p className="text-3xl font-display font-black text-white">{stat.value}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mt-1">{stat.sub}</p>
                </div>
              ))}
            </div>
          )}

          {isInternal && (
            <div className="p-4 bg-hunter-grey neo-border border-zinc-800 border-l-4 border-l-blue-500 max-w-4xl">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardCheck size={16} className="text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Stage 5 — Admin Review</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Pipeline: <span className="text-zinc-400 font-bold">Pending Analysis</span> →
                <span className="text-white font-bold"> Relevant</span> →
                <span className="text-hunter-orange font-bold"> Contact Found</span> →
                <span className="text-blue-400 font-bold"> Awaiting Approval</span> →
                <span className="text-green-400 font-bold"> Approved</span>
              </p>
            </div>
          )}

          {isInternal && aiMetrics && (
            <div className="p-4 bg-hunter-grey neo-border border-zinc-800 border-l-4 border-l-hunter-orange max-w-3xl">
              <div className="flex items-center gap-2 mb-2">
                <BrainCircuit size={16} className="text-hunter-orange" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Local AI Learning</span>
                {aiMetrics.status === 'training' && (
                  <Loader2 size={14} className="animate-spin text-hunter-orange" />
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest">
                {aiMetrics.model_ready && aiMetrics.accuracy !== null ? (
                  <span className="text-green-400">{aiMetrics.accuracy}% Accuracy</span>
                ) : (
                  <span className="text-zinc-500">Accuracy: pending</span>
                )}
                <span className="text-zinc-400">
                  Training samples: <span className="text-white">{aiMetrics.samples}</span>
                </span>
                <span className="text-green-400">{aiMetrics.relevant_count} relevant</span>
                <span className="text-red-400">{aiMetrics.irrelevant_count} irrelevant</span>
              </div>
              <p className="text-xs text-zinc-500 mt-2 normal-case font-medium tracking-normal">
                {aiMetrics.message || 'Approve, reject, or label leads — each decision trains the model automatically.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={handleTrainAi}
                  disabled={isTrainingAi || aiMetrics.samples < 8}
                  className="h-8 px-4 text-[9px] uppercase font-black bg-hunter-orange text-black hover:bg-hunter-orange/80 disabled:opacity-50"
                >
                  {isTrainingAi ? (
                    <>
                      <Loader2 size={12} className="animate-spin mr-1" />
                      Training...
                    </>
                  ) : (
                    <>
                      <BrainCircuit size={12} className="mr-1" />
                      Train AI Now
                    </>
                  )}
                </Button>
                {aiMetrics.samples < 8 && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 self-center">
                    Need {8 - aiMetrics.samples} more labeled leads
                  </span>
                )}
              </div>
              {aiMetrics.samples < 10 && (
                <div className="mt-3 h-1.5 w-full max-w-md bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-hunter-orange transition-all"
                    style={{ width: `${Math.min(100, (aiMetrics.samples / 8) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Tabs System */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-wrap gap-2 p-1 bg-zinc-900 neo-border border-zinc-800 w-fit">
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

        {isInternal && (
          <div className="flex flex-wrap gap-2">
            {(activeTab === 'review' || activeTab === 'with_contact') && (
              <>
                <Button
                  onClick={handleBulkApprove}
                  disabled={bulkApproving}
                  className="h-10 px-5 text-[10px] uppercase font-black flex items-center gap-2 bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-black"
                >
                  {bulkApproving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {bulkApproving ? 'Approving...' : 'Approve All'}
                </Button>
                <Button
                  onClick={handleBulkReject}
                  disabled={bulkRejecting}
                  className="h-10 px-5 text-[10px] uppercase font-black flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-black"
                >
                  {bulkRejecting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  {bulkRejecting ? 'Rejecting...' : 'Reject All'}
                </Button>
              </>
            )}
            <Button
              onClick={handleBulkReanalyse}
              disabled={bulkReanalysing}
              className="h-10 px-5 text-[10px] uppercase font-black flex items-center gap-2 bg-zinc-800 text-zinc-300 hover:bg-hunter-orange hover:text-black"
            >
              {bulkReanalysing ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
              {bulkReanalysing ? 'Queueing...' : 'Re-analyse All'}
            </Button>
            <Button
              onClick={handleBulkReEnrich}
              disabled={bulkReenriching}
              className="h-10 px-5 text-[10px] uppercase font-black flex items-center gap-2 bg-hunter-orange/10 text-hunter-orange border border-hunter-orange/30 hover:bg-hunter-orange hover:text-black"
            >
              {bulkReenriching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {bulkReenriching ? 'Queueing...' : 'Re-enrich All'}
            </Button>
          </div>
        )}

        {isInternal && leads.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-zinc-900/80 neo-border border-zinc-800">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allPageSelected}
                onChange={toggleSelectAllPage}
                className="w-4 h-4 accent-hunter-orange cursor-pointer"
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Select all on page ({leads.length})
              </span>
            </label>

            {selectedLeadIds.length > 0 && (
              <>
                <span className="text-[10px] font-black uppercase tracking-widest text-hunter-orange">
                  {selectedLeadIds.length} selected
                </span>
                <Button
                  onClick={handleBulkApproveSelected}
                  disabled={bulkSelectionBusy || selectedApprovableCount === 0}
                  title={
                    selectedApprovableCount === 0
                      ? 'Selected leads must be awaiting approval with contact details'
                      : undefined
                  }
                  className="h-9 px-4 text-[10px] uppercase font-black flex items-center gap-2 bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-black"
                >
                  {bulkSelectionBusy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Approve Selected{selectedApprovableCount > 0 ? ` (${selectedApprovableCount})` : ''}
                </Button>
                <Button
                  onClick={handleBulkDeleteSelected}
                  disabled={bulkSelectionBusy}
                  className="h-9 px-4 text-[10px] uppercase font-black flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-black"
                >
                  {bulkSelectionBusy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Delete Selected ({selectedLeadIds.length})
                </Button>
                <button
                  type="button"
                  onClick={() => setSelectedLeadIds([])}
                  className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        )}
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
                  {isInternal && (
                    <label className="mt-2 shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.includes(lead._id)}
                        onChange={() => toggleLeadSelection(lead._id)}
                        className="w-4 h-4 accent-hunter-orange cursor-pointer"
                        aria-label={`Select ${lead.author?.name || 'lead'}`}
                      />
                    </label>
                  )}
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

                    {isInternal && lead.qualification_reason && lead.status !== 'pending' && (
                      <div className={`mb-4 p-3 neo-border border-l-2 ${
                        lead.status === 'relevant'
                          ? 'bg-green-500/5 border-green-500/30 border-l-green-500'
                          : 'bg-red-500/5 border-red-500/30 border-l-red-500'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <BrainCircuit size={12} className={lead.status === 'relevant' ? 'text-green-400' : 'text-red-400'} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">
                            AI Review {lead.ai_score ? `(${lead.ai_score}%)` : ''}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">{lead.qualification_reason}</p>
                      </div>
                    )}

                    {isInternal && lead.status === 'relevant' && lead.review_status === 'awaiting_review' && (
                      <div className="mb-4 p-3 bg-blue-500/5 neo-border border-blue-500/30 border-l-2 border-l-blue-500 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck size={14} className="text-blue-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">
                            {leadHasContactDetails(lead)
                              ? 'Contact found — ready to approve (verification optional)'
                              : 'No contact yet — run enrichment before approving'}
                          </span>
                        </div>
                      </div>
                    )}

                    {isInternal && lead.review_status === 'approved' && (
                      <div className="mb-4 p-3 bg-green-500/5 neo-border border-green-500/30 border-l-2 border-l-green-500">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 size={12} className="text-green-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-green-400">
                            Approved — visible on Strategic Leads
                          </span>
                          {/* Ready / Not Ready badge */}
                          {(() => {
                            const { ready, reasons } = getLeadReadiness(lead);
                            return ready ? (
                              <span className="text-[9px] font-black uppercase tracking-widest text-green-400 flex items-center gap-1">
                                <CheckCircle2 size={10} /> Ready
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase tracking-widest text-red-400 flex items-center gap-1">
                                <XCircle size={10} /> Not Ready — {reasons.join(' · ')}
                              </span>
                            );
                          })()}
                          {!lead.intelligence && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-hunter-orange flex items-center gap-1">
                              {intelActionIds.includes(lead._id) ? (
                                <>
                                  <Loader2 size={10} className="animate-spin" /> Generating intel...
                                </>
                              ) : (
                                <>
                                  <Loader2 size={10} className="animate-spin" /> Intel pending — claim locked
                                </>
                              )}
                            </span>
                          )}
                        </div>
                        {!lead.intelligence && (
                          <button
                            type="button"
                            onClick={() => handleRegenerateIntel(lead._id)}
                            disabled={intelActionIds.includes(lead._id)}
                            className="mt-2 text-[9px] font-black uppercase tracking-widest text-hunter-orange hover:text-white disabled:opacity-50"
                          >
                            Retry intel generation
                          </button>
                        )}
                        {lead.reviewed_by_name && (
                          <p className="text-[10px] text-zinc-500">
                            Reviewed by {lead.reviewed_by_name}
                            {lead.reviewed_at ? ` · ${new Date(lead.reviewed_at).toLocaleString()}` : ''}
                          </p>
                        )}
                      </div>
                    )}

                    {isInternal && lead.status === 'pending' && (
                      <div className={`mb-4 p-3 neo-border border-l-2 flex flex-col gap-2 ${
                        lead.qualification_reason
                          ? 'bg-yellow-500/5 border-yellow-500/30 border-l-yellow-500'
                          : 'bg-zinc-900/50 border-zinc-800 border-l-zinc-600'
                      }`}>
                        <div className="flex items-center gap-2">
                          {lead.qualification_reason ? (
                            <BrainCircuit size={14} className="text-yellow-400" />
                          ) : (
                            <Loader2 size={14} className="animate-spin text-zinc-500" />
                          )}
                          <span className={`text-[10px] font-black uppercase tracking-widest ${
                            lead.qualification_reason ? 'text-yellow-300' : 'text-zinc-500'
                          }`}>
                            {lead.qualification_reason ? 'Needs your label — trains the AI' : 'Waiting for AI analysis...'}
                          </span>
                        </div>
                        {lead.qualification_reason && (
                          <>
                            <p className="text-xs text-zinc-400">{lead.qualification_reason}</p>
                            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
                              Mark Relevant or Irrelevant — your label trains the AI
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    {isInternal && canEnrichLead(lead) && lead.enrichment_status === 'searching' && (
                      <div className="mb-4 p-3 bg-hunter-orange/5 neo-border border-hunter-orange/20 flex items-center gap-3">
                        <Loader2 size={14} className="animate-spin text-hunter-orange" />
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-hunter-orange block">
                            Enriching Contacts
                          </span>
                          <span className="text-[10px] text-zinc-500 normal-case font-medium">
                            Searching post, profile, websites, Google Maps, Apollo...
                          </span>
                        </div>
                      </div>
                    )}

                    {isInternal && canEnrichLead(lead) && lead.enrichment_status !== 'searching' && (
                      <div className={`mb-4 p-3 neo-border border-l-2 ${
                        lead.enrichment_status === 'found'
                          ? 'bg-green-500/5 border-green-500/30 border-l-green-500'
                          : lead.enrichment_status === 'partial'
                            ? 'bg-yellow-500/5 border-yellow-500/30 border-l-yellow-500'
                            : lead.enrichment_status === 'not_found'
                              ? 'bg-red-500/5 border-red-500/30 border-l-red-500'
                              : 'bg-zinc-900/50 border-zinc-800 border-l-zinc-600'
                      }`}>
                        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Mail size={12} className={
                              lead.enrichment_status === 'found'
                                ? 'text-green-400'
                                : lead.enrichment_status === 'partial'
                                  ? 'text-yellow-400'
                                  : lead.enrichment_status === 'not_found'
                                    ? 'text-red-400'
                                    : 'text-zinc-500'
                            } />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">
                              Contact Enrichment{lead.enrichment_status ? `: ${getEnrichmentStatusLabel(lead.enrichment_status)}` : ''}
                            </span>
                          </div>
                          <Button
                            onClick={() => handleReEnrichLead(lead._id)}
                            disabled={enrichingIds.includes(lead._id)}
                            className="h-8 px-3 text-[9px] uppercase font-black flex items-center gap-1.5 bg-hunter-orange/10 text-hunter-orange border border-hunter-orange/30 hover:bg-hunter-orange hover:text-black"
                          >
                            {enrichingIds.includes(lead._id) ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <RefreshCw size={12} />
                            )}
                            {enrichingIds.includes(lead._id) ? 'Queueing...' : getEnrichButtonLabel(lead)}
                          </Button>
                          <Button
                            onClick={() => {
                              setManualContactLead(lead);
                              setIsManualContactOpen(true);
                            }}
                            className="h-8 px-3 text-[9px] uppercase font-black flex items-center gap-1.5 bg-blue-500/10 text-blue-300 border border-blue-500/30 hover:bg-blue-500 hover:text-black"
                          >
                            <ClipboardPaste size={12} />
                            Paste Contact
                          </Button>
                        </div>
                        {(!lead.enrichment_status || lead.enrichment_status === 'pending') && (
                          <p className="text-xs text-zinc-500">
                            Enrichment is manual — click Find Contacts when you want to spend API credits.
                          </p>
                        )}
                        {lead.enrichment_message && (
                          <p className="text-xs text-zinc-400">{lead.enrichment_message}</p>
                        )}
                      </div>
                    )}

                    {isInternal && lead.status === 'relevant' && !canEnrichLead(lead) && lead.enrichment_status && lead.enrichment_status !== 'searching' && (
                      <div className={`mb-4 p-3 neo-border border-l-2 ${
                        lead.enrichment_status === 'found'
                          ? 'bg-green-500/5 border-green-500/30 border-l-green-500'
                          : lead.enrichment_status === 'partial'
                            ? 'bg-yellow-500/5 border-yellow-500/30 border-l-yellow-500'
                            : lead.enrichment_status === 'not_found'
                              ? 'bg-red-500/5 border-red-500/30 border-l-red-500'
                              : 'bg-zinc-900/50 border-zinc-800 border-l-zinc-600'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Mail size={12} className={
                            lead.enrichment_status === 'found'
                              ? 'text-green-400'
                              : lead.enrichment_status === 'partial'
                                ? 'text-yellow-400'
                                : lead.enrichment_status === 'not_found'
                                  ? 'text-red-400'
                                  : 'text-zinc-500'
                          } />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">
                            Contact Enrichment: {getEnrichmentStatusLabel(lead.enrichment_status)}
                          </span>
                        </div>
                        {lead.enrichment_message && (
                          <p className="text-xs text-zinc-400">{lead.enrichment_message}</p>
                        )}
                      </div>
                    )}

                    {/* Lead Intelligence - ALWAYS SHOWN if relevant */}
                    {lead.intelligence && (
                      <div
                        id={`lead-intel-${lead._id}`}
                        className="mb-4 p-3 bg-zinc-900/50 neo-border border-zinc-800 border-l-hunter-orange border-l-2"
                      >
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

                    {getLeadEmailEntries(lead).length > 0 || (lead.contact_info?.phone_numbers && lead.contact_info.phone_numbers.length > 0) ? (
                      <div className="mb-6 p-4 bg-hunter-orange/5 neo-border border-hunter-orange/20 relative overflow-hidden group/email">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-hunter-orange/5 -rotate-45 translate-x-8 -translate-y-8" />
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-hunter-orange/10 flex items-center justify-center neo-border border-hunter-orange/30">
                            <Mail size={12} className="text-hunter-orange" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-hunter-orange">
                            {getLeadEmailEntries(lead).length > 1 ? 'Contact Emails' : 'Contact Email'}
                          </span>
                          {lead.contact_info?.email_conflict && (
                            <span className="text-[8px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 neo-border border-yellow-500/30 uppercase font-black">
                              Conflict
                            </span>
                          )}
                        </div>

                        {lead.contact_info?.email_conflict && (
                          <p className="text-[10px] text-yellow-500/90 mb-4 normal-case font-medium">
                            Contact Compass and Hunter.io found different emails. Review both below.
                          </p>
                        )}

                        <div className="space-y-4">
                          {getLeadEmailEntries(lead).map((entry, index) => (
                            <div
                              key={`${entry.email}-${index}`}
                              className={cn(
                                'p-3 neo-border border-zinc-800 bg-black/20',
                                entry.is_primary && getLeadEmailEntries(lead).length > 1 && 'border-hunter-orange/40'
                              )}
                            >
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <p className="text-lg font-display font-black text-white tracking-tight">{entry.email}</p>
                                {renderEmailBadge(entry.email_status, entry.email_source)}
                                {entry.is_primary && getLeadEmailEntries(lead).length > 1 && (
                                  <span className="text-[8px] px-1.5 py-0.5 bg-hunter-orange/10 text-hunter-orange neo-border border-hunter-orange/30 uppercase font-black">
                                    Primary
                                  </span>
                                )}
                              </div>
                              {formatFoundBy(entry.found_by) && (
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                                  Found by: {formatFoundBy(entry.found_by)}
                                </p>
                              )}
                              {formatVerifiedByLabel(entry.verified_by) && (
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                                  {formatVerifiedByLabel(entry.verified_by)}
                                </p>
                              )}
                              {!isRedundantEmailNote(entry.find_note) && (
                                <p className="text-[10px] text-zinc-500 mt-1 normal-case font-medium">{entry.find_note}</p>
                              )}
                              {!isRedundantEmailNote(entry.verification_note) && (
                                <p className="text-[10px] text-zinc-400 mt-1 normal-case font-medium">{entry.verification_note}</p>
                              )}
                            </div>
                          ))}
                        </div>

                        {lead.contact_info?.phone_numbers?.map((p: any, i: number) => (
                          <div key={i} className="mt-3">
                            <p className="text-sm font-bold text-zinc-400">{p.number}</p>
                            {getEmailSourceLabel(p.source) && (
                              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                                Found via: {getEmailSourceLabel(p.source)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : isInternal && lead.status === 'relevant' && canEnrichLead(lead) && (
                      <div className="flex flex-col gap-3 mb-6">
                        <div className="p-4 bg-zinc-900/30 neo-border border-zinc-800 space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Contact Details</p>
                          <div className="space-y-2">
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-0.5">Email</p>
                              <p className="text-xs text-zinc-400">Not found yet</p>
                            </div>
                            {lead.contact_info?.phone_numbers && lead.contact_info.phone_numbers.length > 0 ? (
                              lead.contact_info.phone_numbers.map((p: any, i: number) => (
                                <div key={i}>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-0.5">Phone</p>
                                  <p className="text-xs text-zinc-300">{p.number}</p>
                                  {getEmailSourceLabel(p.source) && (
                                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                                      {getEmailSourceLabel(p.source)}
                                    </p>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div>
                                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-0.5">Phone</p>
                                <p className="text-xs text-zinc-400">Not found yet</p>
                              </div>
                            )}
                          </div>
                          {(lead.author?.url || lead.url) && (lead.author?.url || lead.url) !== '#' && (
                            <a
                              href={lead.author?.url || lead.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[9px] text-hunter-orange font-black uppercase hover:underline"
                            >
                              View LinkedIn Profile <ExternalLink size={10} />
                            </a>
                          )}
                          <Button
                            onClick={() => {
                              setManualContactLead(lead);
                              setIsManualContactOpen(true);
                            }}
                            className="h-8 text-[9px] uppercase font-black flex items-center gap-1.5 bg-blue-500/10 text-blue-300 border border-blue-500/30 hover:bg-blue-500 hover:text-black"
                          >
                            <ClipboardPaste size={12} />
                            Paste Contact
                          </Button>
                        </div>
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
                      <div className="flex gap-1.5 flex-wrap">
                        {lead.status === 'pending' && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => updateLeadLabel(lead._id, { status: 'relevant' })}
                              className="h-7 text-[8px] uppercase font-black px-3 bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500 hover:text-black"
                            >
                              Mark Relevant
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => updateLeadLabel(lead._id, { status: 'irrelevant' })}
                              className="h-7 text-[8px] uppercase font-black px-3"
                            >
                              Irrelevant
                            </Button>
                          </>
                        )}

                        {lead.status === 'relevant' && lead.review_status === 'awaiting_review' && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleApproveReview(lead._id)}
                              disabled={reviewActionIds.includes(lead._id) || !leadHasContactDetails(lead)}
                              title={!leadHasContactDetails(lead) ? 'Contact details required before approval' : undefined}
                              className={cn(
                                "h-7 text-[8px] uppercase font-black px-3",
                                leadHasContactDetails(lead)
                                  ? "bg-green-500 text-black border-green-500 hover:bg-green-600"
                                  : "bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed"
                              )}
                            >
                              {reviewActionIds.includes(lead._id) ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={12} className="inline mr-1" />
                              )}
                              Approve
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleRejectReview(lead._id)}
                              disabled={reviewActionIds.includes(lead._id)}
                              className="h-7 text-[8px] uppercase font-black px-3 bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500 hover:text-black"
                            >
                              Reject
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => updateLeadLabel(lead._id, { status: 'pending' })}
                              className="h-7 text-[8px] uppercase font-black px-3"
                            >
                              Reset
                            </Button>
                          </>
                        )}

                        {lead.status === 'irrelevant' && (
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

                      <div className="flex items-center gap-3 flex-wrap justify-end">
                        <div className={`px-1.5 py-0.5 text-[7px] font-black uppercase tracking-tighter neo-border ${lead.status === 'relevant' ? 'bg-green-500/10 text-green-500 border-green-500/50' :
                          lead.status === 'irrelevant' ? 'bg-red-500/10 text-red-500 border-red-500/50' :
                            'bg-zinc-800 text-zinc-500 border-zinc-700'
                          }`}>
                          {lead.status || 'pending'}
                        </div>
                        {lead.review_status === 'awaiting_review' && (
                          <div className="px-1.5 py-0.5 text-[7px] font-black uppercase tracking-tighter neo-border bg-blue-500/10 text-blue-400 border-blue-500/50">
                            awaiting approval
                          </div>
                        )}
                        {lead.review_status === 'approved' && (
                          <div className="px-1.5 py-0.5 text-[7px] font-black uppercase tracking-tighter neo-border bg-green-500/10 text-green-400 border-green-500/50">
                            approved
                          </div>
                        )}
                        {lead.review_status === 'approved' && lead.intelligence && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                document.getElementById(`lead-intel-${lead._id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }}
                              className="h-7 text-[8px] uppercase font-black px-4 bg-zinc-800 text-white border border-zinc-700 hover:border-hunter-orange flex items-center gap-2"
                            >
                              <BrainCircuit size={12} /> View Intel
                            </button>
                            <Link href={`/leads/relevant?lead=${lead._id}`}>
                              <Button
                                size="sm"
                                className="h-7 text-[8px] uppercase font-black px-4 bg-hunter-orange text-black border-black flex items-center gap-2"
                              >
                                <ExternalLink size={12} /> Hunter Preview
                              </Button>
                            </Link>
                          </>
                        )}
                        {lead.review_status === 'approved' && (
                          <Button 
                            size="sm" 
                            className={cn(
                              "h-7 text-[8px] uppercase font-black px-4 transition-all",
                              lead.is_claimed 
                                ? "bg-zinc-800 text-zinc-500 border-zinc-700 pointer-events-none" 
                                : "bg-white text-black hover:bg-hunter-orange hover:text-black"
                            )}
                            onClick={() => handleClaim(lead._id)}
                            disabled={claimingIds.includes(lead._id) || lead.is_claimed || !lead.intelligence}
                          >
                            {claimingIds.includes(lead._id) ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : lead.is_claimed ? (
                              "Claimed"
                            ) : !lead.intelligence ? (
                              "Intel pending"
                            ) : (
                              `Claim (${lead.claimed_count || 0}/25)`
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDeleteLead(lead)}
                          disabled={deletingIds.includes(lead._id)}
                          className="h-7 text-[8px] uppercase font-black px-3 bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500 hover:text-black"
                          title="Delete lead"
                        >
                          {deletingIds.includes(lead._id) ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <>
                              <Trash2 size={12} className="inline mr-1" />
                              Delete
                            </>
                          )}
                        </Button>
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

      <ManualContactModal
        isOpen={isManualContactOpen}
        onClose={() => {
          setIsManualContactOpen(false);
          setManualContactLead(null);
        }}
        onSuccess={() => fetchLeads(currentPage, activeTab, searchQuery, selectedPlatforms, true)}
        lead={manualContactLead}
      />
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
