"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Trophy, Medal, Star, User as UserIcon } from "lucide-react";
import { cn } from "@/components/ui/HunterUI";

export default function LeaderboardPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data } = await api.get("/leaderboard");
        setUsers(data.data || []);
      } catch (error) {
        console.error("Failed to fetch leaderboard", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hunter-orange"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-black uppercase tracking-tighter mb-2 italic">
          Hall of <span className="text-hunter-orange">Hunters</span>
        </h1>
        <p className="text-zinc-500 font-display font-bold uppercase text-[10px] tracking-widest">
          Top performers and their strategic standings
        </p>
      </div>

      <div className="grid gap-4">
        {users.map((hunter, index) => (
          <div
            key={hunter._id}
            className={cn(
              "neo-border-sm p-4 flex items-center justify-between transition-all hover:-translate-y-1 hover:translate-x-1",
              index === 0 ? "bg-hunter-orange text-black" : "bg-hunter-grey text-white"
            )}
          >
            <div className="flex items-center gap-4">
              <div className="w-8 font-display font-black text-xl italic italic">
                #{index + 1}
              </div>
              
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                index === 0 ? "bg-black text-hunter-orange" : "bg-hunter-black text-white"
              )}>
                {index === 0 ? <Trophy size={24} /> : index === 1 ? <Medal size={24} className="text-zinc-400" /> : index === 2 ? <Medal size={24} className="text-orange-900" /> : <UserIcon size={20} />}
              </div>

              <div>
                <div className="font-display font-black uppercase tracking-tight text-sm">
                  {hunter.name}
                  {hunter.plan === 'enterprise' && <span className="ml-2 text-[8px] bg-black text-white px-1 py-0.5 rounded">ENT</span>}
                </div>
                <div className={cn("text-[10px] font-bold uppercase tracking-tighter", index === 0 ? "text-black/60" : "text-zinc-500")}>
                   {hunter.referral_count || 0} Referrals
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="font-display font-black text-2xl italic tracking-tighter leading-none">
                {hunter.points}
              </div>
              <div className={cn("text-[8px] font-black uppercase tracking-widest", index === 0 ? "text-black/60" : "text-zinc-500")}>
                HUNT POINTS
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-zinc-900/30 border border-zinc-800 rounded-lg">
        <h3 className="font-display font-black uppercase text-xs mb-4 flex items-center gap-2">
          <Star size={14} className="text-hunter-orange" /> How to earn points?
        </h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-hunter-orange rounded-full" />
            Engage with high-value leads (+10 pts)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-hunter-orange rounded-full" />
            Invite a strategic partner (+50 pts)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-hunter-orange rounded-full" />
            Daily posting activity (+5 pts)
          </li>
          <li className="flex items-center gap-2 text-hunter-orange">
            <span className="w-1.5 h-1.5 bg-white rounded-full" />
            Every 100 points = 1 Bounty Token
          </li>
        </ul>
      </div>
    </div>
  );
}
