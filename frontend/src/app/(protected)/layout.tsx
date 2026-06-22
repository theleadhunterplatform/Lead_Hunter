"use client";

import { useRouter, usePathname } from "next/navigation";
import { 
  Loader2, 
  LayoutDashboard, 
  Users, 
  Key, 
  Target, 
  Hash, 
  Building2, 
  LogOut, 
  MessageSquare, 
  Trophy,
  Settings,
  Shield,
  UserSearch
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/components/ui/HunterUI";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, hasPermission, logout, activeOrgId, setActiveOrgId, permissions } = useAuth();
  const [organizations, setOrganizations] = useState<any[]>([]);

  useEffect(() => {
    // Fetch organizations for the switcher
    const fetchOrgs = async () => {
      try {
        const { data } = await api.get('/auth/organizations');
        setOrganizations(data.data || []);
      } catch (error) {
        console.error('Failed to fetch orgs', error);
      }
    };
    if (user) fetchOrgs();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hunter-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-hunter-orange animate-spin" />
          <p className="font-display font-bold uppercase tracking-widest text-xs text-zinc-500">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    {
      name: permissions.has('*') ? "Lead Intelligence" : "Strategic Leads",
      href: permissions.has('*') ? "/lead-intelligence" : "/leads/relevant",
      icon: MessageSquare,
      permission: 'lead:read',
    },
    { name: "My CRM", href: "/crm", icon: LayoutDashboard, permission: 'lead:read' },
    { name: "Hall of Hunters", href: "/leaderboard", icon: Trophy },
    { name: "Organization Team", href: "/team", icon: Users, permission: 'user:read' },
    { name: "Search Keys", href: "/tokens", icon: Key, permission: 'scraping:manage' },
    { name: "Search Keywords", href: "/keywords", icon: Hash, permission: 'keyword:read' },
    { name: "Watchlist", href: "/targets", icon: UserSearch, permission: 'target:read' },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (item.permission && !hasPermission(item.permission)) return false;

    // Admin defined restriction for Lead related data
    const isLeadModule = item.name.toLowerCase().includes('lead') || item.name.toLowerCase().includes('crm');
    if (isLeadModule && !permissions.has('*') && user?.lead_access_enabled === false) {
      return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen flex bg-hunter-black">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r-3 border-hunter-orange bg-hunter-black hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b-3 border-hunter-orange">
          <Link href="/" className="font-display font-black text-xl uppercase tracking-tighter">
            The Lead <span className="text-hunter-orange">Hunter</span>
          </Link>
        </div>

        {/* Organization Switcher */}
        {/* <div className="p-4 border-b border-zinc-900">
          <div className="flex flex-col gap-2">
            <span className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter flex items-center gap-1">
              <Building2 size={10} /> Active Business
            </span>
            <select
              className="bg-hunter-grey border border-zinc-800 text-white p-2 font-display font-bold text-[10px] outline-none focus:border-hunter-orange transition-colors uppercase tracking-widest"
              value={activeOrgId || ""}
              onChange={(e) => setActiveOrgId(e.target.value || null)}
            >
              <option value="">All Businesses</option>
              {organizations.map(org => (
                <option key={org._id} value={org._id}>{org.name}</option>
              ))}
            </select>
          </div>
        </div> */}

        <nav className="flex-1 p-4 space-y-2">
          {filteredNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === '/lead-intelligence' && pathname.startsWith('/lead-intelligence')) ||
              (item.href === '/leads/relevant' && pathname.startsWith('/leads/relevant')) ||
              (item.href === '/keywords' && pathname.startsWith('/keywords'));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 font-display font-bold uppercase text-xs tracking-widest transition-all",
                  isActive
                    ? "bg-hunter-orange text-black neo-border border-black"
                    : "text-zinc-500 hover:text-white hover:bg-hunter-grey"
                )}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t-2 border-zinc-900">
          <div className="flex items-center gap-3 mb-4 px-4">
            <div className="w-8 h-8 rounded-full bg-hunter-orange flex items-center justify-center font-black text-black text-xs">
              {user?.name?.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <div className="text-[10px] font-black uppercase truncate">{user?.name}</div>
              <div className="text-[8px] text-zinc-500 truncate">{user?.email}</div>
            </div>
          </div>
          
          {/* Tokens and Points Display */}
          <div className="px-4 py-2 mb-2 space-y-1">
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-zinc-500 uppercase tracking-tighter">Tokens</span>
              <span className="text-hunter-orange">{user?.tokens || 0}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-zinc-500 uppercase tracking-tighter">Points</span>
              <span className="text-blue-400">{user?.points || 0}</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 font-display font-bold uppercase text-xs tracking-widest text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header (simplified) */}
        <div className="md:hidden p-4 border-b-3 border-hunter-orange flex items-center justify-between">
          <span className="font-display font-black uppercase">Dashboard</span>
          <button onClick={logout} className="text-red-500"><LogOut size={18} /></button>
        </div>
        {children}
      </main>
    </div>
  );
}
