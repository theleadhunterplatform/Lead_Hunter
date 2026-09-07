"use client";

import { Button } from "@/components/ui/HunterUI";
import api from "@/lib/api";
import { applyClaimResponseToLead } from "@/lib/claim-reveal";
import { motion } from "framer-motion";
import { Activity, BrainCircuit, CheckCircle2, ChevronRight, Copy, Gift, Loader2, Shield, Target, TrendingUp, UserPlus, Users, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import ReactMarkdown from 'react-markdown';

import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ADMIN_ROUTES, hasAdminAreaAccess } from "@/lib/routes";

export default function DashboardPage() {
  const router = useRouter();
  const { user, refreshUser, hasPermission, permissions, loading: authLoading } = useAuth();
  const [teamCount, setTeamCount] = useState<number>(0);
  const [topLeads, setTopLeads] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claimingIds, setClaimingIds] = useState<string[]>([]);
  const [scrapingAll, setScrapingAll] = useState(false);

  const handleClaim = async (leadId: string) => {
    try {
      setClaimingIds(prev => [...prev, leadId]);
      const response = await api.post(`/posts/${leadId}/claim`);
      
      setTopLeads(prev => prev.map(l => 
        l._id === leadId ? applyClaimResponseToLead(l, response.data) : l
      ));
      
      toast.success("Lead successfully claimed!", {
        description: "The full signal and contact details are now unlocked."
      });
      
      refreshUser();
    } catch (err: any) {
      toast.error("Failed to claim lead", {
        description: err.response?.data?.error || "An error occurred while claiming the lead."
      });
    } finally {
      setClaimingIds(prev => prev.filter(id => id !== leadId));
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: statsData } = await api.get("/dashboard/stats");
        setStats(statsData.data);

        if (hasPermission('user:read')) {
          const { data: teamData } = await api.get("/auth/organization/users");
          const members = teamData.data || teamData;
          setTeamCount(Array.isArray(members) ? members.length : 0);
        }

        const { data: leadsData } = await api.get("/posts?status=relevant&limit=3");
        setTopLeads(leadsData.data || []);

      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (!authLoading && !user) {
      setLoading(false);
      return;
    }

    if (!authLoading && user) {
      fetchDashboardData();
    }
  }, [authLoading, user, hasPermission]);

  const handleScrapeAllTargets = async () => {
    try {
      setScrapingAll(true);
      const { data } = await api.post("/targets/scrape-all");
      toast.success("Watchlist scrape queued", {
        description: data.message,
      });
    } catch (err: any) {
      toast.error("Failed to queue scrape", {
        description: err.response?.data?.error || "Could not start watchlist scrape.",
      });
    } finally {
      setScrapingAll(false);
    }
  };

  const isInternal = permissions.has('*');
  const isOrgAdmin = hasPermission('org:read');
  const isNormalUser = !isInternal && !isOrgAdmin;

  useEffect(() => {
    if (authLoading) return;
    if (hasAdminAreaAccess(permissions, hasPermission)) {
      router.replace(ADMIN_ROUTES.dashboard);
    }
  }, [authLoading, permissions, hasPermission, router]);

  const weeklyGoal = stats?.weekly_goal ?? 100;
  const weeklyProgress = stats?.leads?.qualified_this_week ?? 0;
  const weeklyPercent = Math.min(100, Math.round((weeklyProgress / weeklyGoal) * 100));

  const quickStats = isInternal
    ? [
        { label: "Qualified Today", value: stats?.leads?.qualified_today?.toString() ?? "0", icon: Zap, color: "text-hunter-orange" },
        { label: "Qualified Total", value: stats?.leads?.qualified_total?.toString() ?? "0", icon: Target, color: "text-yellow-400" },
        { label: "Watchlist Active", value: stats?.leads?.watchlist_active?.toString() ?? "0", icon: Activity, color: "text-blue-400" },
        { label: "Success Rate", value: `${stats?.success_rate ?? 0}%`, icon: TrendingUp, color: "text-green-400" },
      ]
    : isOrgAdmin
    ? [
        { label: "Team Members", value: teamCount.toString(), icon: Users, color: "text-hunter-orange" },
        { label: "Available Leads", value: stats?.leads?.available_to_claim?.toString() ?? "0", icon: Target, color: "text-yellow-400" },
        { label: "Qualified Today", value: stats?.leads?.qualified_today?.toString() ?? "0", icon: Activity, color: "text-blue-400" },
        { label: "Success Rate", value: `${stats?.success_rate ?? 0}%`, icon: TrendingUp, color: "text-green-400" },
      ]
    : [
        { label: "Remaining Tokens", value: stats?.user?.tokens?.toString() ?? user?.tokens?.toString() ?? "0", icon: Zap, color: "text-hunter-orange" },
        { label: "Claimed Leads", value: stats?.user?.claimed_leads?.toString() ?? "0", icon: Target, color: "text-yellow-400" },
        { label: "Available Leads", value: stats?.leads?.available_to_claim?.toString() ?? "0", icon: Activity, color: "text-blue-400" },
        { label: "Success Rate", value: `${stats?.success_rate ?? 0}%`, icon: TrendingUp, color: "text-green-400" },
      ];

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading Dashboard...</div>;
  }

  if (hasAdminAreaAccess(permissions, hasPermission)) {
    return <div className="flex items-center justify-center min-h-screen">Loading Dashboard...</div>;
  }

  const getRoleLabel = () => {
    if (isInternal) return "Platform Overlord";
    if (isOrgAdmin) return "Business Strategist";
    return "Elite Hunter";
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-0.5 bg-hunter-orange text-black font-display font-black text-[10px] uppercase neo-border border-black">
              Role: {getRoleLabel()}
            </span>
            {user?.organization && (
              <span className="text-hunter-orange font-bold text-[10px] uppercase tracking-widest border-b border-hunter-orange">
                {user.organization.name}
              </span>
            )}
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-black uppercase italic leading-none">
            {isInternal ? "System" : isOrgAdmin ? "Business" : "My"} <br />
            <span className="text-hunter-orange">{isInternal ? "Control" : "Dashboard"}.</span>
          </h1>
          
          {/* Progress Bar */}
          <div className="mt-6 w-full max-w-md">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Weekly Goal Progress</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-hunter-orange">
                {weeklyProgress} / {weeklyGoal} Leads Found
              </span>
            </div>
            <div className="h-4 bg-hunter-grey neo-border border-zinc-800 relative overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${weeklyPercent}%` }}
                className="absolute inset-y-0 left-0 bg-hunter-orange"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Button className="md:text-xl px-8" onClick={() => window.location.href = isInternal ? '/lead-intelligence' : '/leads/relevant'}>
            Find Leads
          </Button>
        </div>
      </header>

      {/* Role-Based Hubs */}
      {isInternal ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-10 bg-zinc-800 p-1 flex flex-col md:flex-row items-stretch neo-border border-hunter-orange"
        >
          <div className="bg-black p-8 flex-1 flex flex-col justify-center">
            <h2 className="text-3xl font-display font-black uppercase mb-2">Platform Control</h2>
            <p className="text-hunter-orange font-bold uppercase text-[10px] tracking-[0.2em] mb-6">Master system configuration and oversight</p>
            
            <div className="flex flex-wrap gap-6">
              <Link href="/rbac" className="flex items-center gap-2 group">
                <div className="p-2 bg-hunter-grey neo-border border-zinc-800 group-hover:border-hunter-orange transition-colors">
                  <Shield className="text-hunter-orange" size={20} />
                </div>
                <div>
                  <p className="text-white font-black uppercase text-xs">RBAC Engine</p>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Manage Roles</p>
                </div>
              </Link>

              <Link href="/tokens" className="flex items-center gap-2 group">
                <div className="p-2 bg-hunter-grey neo-border border-zinc-800 group-hover:border-hunter-orange transition-colors">
                  <Zap className="text-hunter-orange" size={20} />
                </div>
                <div>
                  <p className="text-white font-black uppercase text-xs">Economy Hub</p>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Platform Tokens</p>
                </div>
              </Link>
            </div>
          </div>
          <div className="bg-hunter-grey p-8 md:w-80 flex flex-col justify-center gap-4">
             <Link href="/lead-intelligence">
               <Button variant="secondary" className="w-full">Lead Intelligence</Button>
             </Link>
             <Button
               className="w-full flex items-center justify-center gap-2"
               onClick={handleScrapeAllTargets}
               disabled={scrapingAll}
             >
               {scrapingAll ? <Loader2 size={16} className="animate-spin" /> : null}
               {scrapingAll ? "Queueing..." : "Scrape All Watchlist"}
             </Button>
          </div>
        </motion.div>
      ) : isOrgAdmin ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-10 bg-hunter-orange p-1 flex flex-col md:flex-row items-stretch neo-border border-black"
        >
          <div className="bg-black p-8 flex-1 flex flex-col justify-center">
            <h2 className="text-3xl font-display font-black uppercase mb-2">Team Management</h2>
            <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em] mb-6">Manage your team and watch leads come in</p>
            
            <div className="flex flex-wrap gap-6">
              <Link href="/team" className="flex items-center gap-2 group">
                <div className="p-2 bg-hunter-grey neo-border border-zinc-800 group-hover:border-hunter-orange transition-colors">
                  <Users className="text-hunter-orange" size={20} />
                </div>
                <div>
                  <p className="text-white font-black uppercase text-xs">Manage Team</p>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{teamCount} Team Members</p>
                </div>
              </Link>

              <Link href="/keywords" className="flex items-center gap-2 group">
                <div className="p-2 bg-hunter-grey neo-border border-zinc-800 group-hover:border-hunter-orange transition-colors">
                  <Activity className="text-hunter-orange" size={20} />
                </div>
                <div>
                  <p className="text-white font-black uppercase text-xs">Search Settings</p>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Main Configuration</p>
                </div>
              </Link>
            </div>
          </div>

          <div className="bg-hunter-grey p-8 md:w-80 flex flex-col justify-center gap-4">
            <Link href="/team" className="w-full">
              <Button variant="secondary" className="w-full flex items-center justify-between group">
                <span>Add Team Member</span>
                <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
              </Button>
            </Link>
            <Link href={isInternal ? "/lead-intelligence" : "/leads/relevant"} className="w-full text-center py-3 border-2 border-zinc-800 font-display font-black uppercase text-xs tracking-widest hover:bg-zinc-800 transition-colors">
              View All Posts
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
           <Link href={isInternal ? "/lead-intelligence" : "/leads/relevant"} className="bg-hunter-grey p-8 neo-border border-zinc-800 hover:border-hunter-orange transition-all group">
              <h3 className="text-2xl font-display font-black uppercase mb-2">Find Leads</h3>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-6">Explore qualified intelligence</p>
              <div className="flex items-center gap-2 text-hunter-orange font-black text-xs uppercase tracking-widest">
                Go to Intelligence Hub <ChevronRight size={14} />
              </div>
           </Link>
           <Link href="/crm" className="bg-hunter-grey p-8 neo-border border-zinc-800 hover:border-hunter-orange transition-all group">
              <h3 className="text-2xl font-display font-black uppercase mb-2">My CRM</h3>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-6">Manage your claimed leads</p>
              <div className="flex items-center gap-2 text-hunter-orange font-black text-xs uppercase tracking-widest">
                Go to CRM <ChevronRight size={14} />
              </div>
           </Link>
        </div>
      )}

      {isNormalUser && (stats?.leads?.available_to_claim ?? 0) === 0 && (
        <div className="mb-10 p-6 bg-hunter-orange/10 neo-border border-hunter-orange/40">
          <h3 className="font-display font-black uppercase text-lg mb-2">No leads available yet</h3>
          <p className="text-zinc-400 text-sm max-w-2xl">
            Strategic leads appear here after our team scrapes, enriches, and approves them.
            Check back soon — new approved leads show up on{" "}
            <Link href="/leads/relevant" className="text-hunter-orange font-bold hover:underline">Strategic Leads</Link>.
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {quickStats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-hunter-grey neo-border border-zinc-800"
          >
            <stat.icon className={`${stat.color} w-6 h-6 mb-4`} />
            <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-3xl font-display font-black">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Strategic Intelligence */}
        <div className="lg:col-span-2 bg-hunter-grey neo-border border-zinc-800 p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-display font-black uppercase flex items-center gap-3">
              <BrainCircuit className="text-hunter-orange" /> Top Intelligence
            </h2>
            <Link href={isInternal ? "/lead-intelligence" : "/leads/relevant"} className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest hover:text-hunter-orange transition-colors">
              View All Reports
            </Link>
          </div>
          
          <div className="space-y-6">
            {topLeads.length === 0 ? (
              <div className="py-10 text-center text-zinc-600 font-black uppercase text-xs tracking-widest italic">
                Scanning for high-value signals...
              </div>
            ) : (
              topLeads.map((lead, i) => (
                <div key={lead._id} className="p-6 bg-hunter-black neo-border border-zinc-800 group hover:border-hunter-orange transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-hunter-orange rounded-full animate-pulse" />
                      <span className="text-white font-black uppercase text-xs tracking-tighter">Report for {lead.author.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">{lead.platform}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed mb-4 line-clamp-3 italic prose prose-invert prose-xs">
                    {lead.intelligence ? (
                      <ReactMarkdown>{lead.intelligence}</ReactMarkdown>
                    ) : (
                      <span className="text-zinc-600">Intelligence report pending...</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-4 mt-2">
                    <Link href={isInternal ? "/lead-intelligence" : "/leads/relevant"} className="inline-flex items-center gap-2 text-hunter-orange text-[9px] font-black uppercase tracking-widest group-hover:gap-3 transition-all">
                      Open Full Strategy <ChevronRight size={12} />
                    </Link>
                    
                    {isInternal ? (
                      <Link
                        href="/lead-intelligence"
                        className="text-[9px] font-black uppercase text-hunter-orange flex items-center gap-1 hover:underline"
                      >
                        Review in Lead Intelligence <ChevronRight size={12} />
                      </Link>
                    ) : lead.is_claimed ? (
                      <span className="text-[9px] font-black uppercase text-green-500 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Unlocked
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        className="h-8 px-4 text-[9px] font-black uppercase bg-white text-black hover:bg-hunter-orange transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={() => handleClaim(lead._id)}
                        disabled={
                          claimingIds.includes(lead._id) ||
                          !(lead.has_intelligence || lead.intelligence)
                        }
                        title={
                          !(lead.has_intelligence || lead.intelligence)
                            ? "Strategic report is still generating"
                            : undefined
                        }
                      >
                        {claimingIds.includes(lead._id) ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Zap size={12} />
                        )}
                        {lead.has_intelligence || lead.intelligence
                          ? "Claim Now"
                          : "Intel pending"}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Referral Program */}
        <div className="bg-hunter-grey neo-border border-zinc-800 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Gift className="text-hunter-orange" />
            <h2 className="text-3xl font-display font-black uppercase">Referrals</h2>
          </div>
          
          <div className="bg-black p-4 neo-border border-zinc-800 mb-6">
            <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-2">Your Referral Link</p>
            <div className="flex items-center gap-2">
              <input 
                readOnly 
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${user?._id}`}
                className="bg-hunter-grey border border-zinc-800 px-3 py-2 text-[10px] font-black text-white w-full outline-none focus:border-hunter-orange transition-colors"
              />
              <button 
                onClick={() => {
                  const link = `${window.location.origin}/register?ref=${user?._id}`;
                  navigator.clipboard.writeText(link);
                  toast.success("Link copied!", { description: "Share this link to earn tokens." });
                }}
                className="p-2 bg-hunter-orange text-black hover:bg-white transition-colors neo-border border-black"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-hunter-orange/10 neo-border border-hunter-orange/30">
            <div>
              <p className="text-white font-black uppercase text-xs">Total Referrals</p>
              <p className="text-hunter-orange font-bold uppercase text-[10px] tracking-widest">{user?.referral_count || 0} Successful signups</p>
            </div>
            <div className="text-3xl font-display font-black text-hunter-orange">
              {user?.referral_count || 0}
            </div>
          </div>

          <p className="mt-6 text-zinc-500 font-bold uppercase text-[10px] tracking-widest text-center leading-relaxed">
            Earn <span className="text-hunter-orange">5 Tokens</span> for every <br /> successful team lead you refer!
          </p>
        </div>
      </div>
    </div>
  );
}
