"use client";

import { motion } from "framer-motion";
import { Target, Zap, Shield, ChevronRight, Activity, Users, Filter } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b-3 border-hunter-orange bg-hunter-black sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-hunter-orange neo-border rounded-sm">
            <Target className="text-black w-6 h-6" />
          </div>
          <span className="font-display font-black text-2xl uppercase tracking-tighter">
            The Lead <span className="text-hunter-orange">Hunter</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 font-display font-bold uppercase text-sm tracking-widest">
          <Link href="/login" className="hover:text-hunter-orange transition-colors">Sign In</Link>
          <Link href="/privacy" className="hover:text-hunter-orange transition-colors">Privacy</Link>
        </div>

        <Link href="/login" className="neo-orange-border bg-hunter-orange text-black px-4 py-1 font-display font-black uppercase text-sm hover:translate-x-[2px] hover:translate-y-[2px] transition-transform active:translate-x-[4px] active:translate-y-[4px]">
          Sign In
        </Link>
      </nav>

      <main className="flex-1 relative">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* Hero Section */}
        <section className="relative px-6 py-24 md:py-40 overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-block px-4 py-1.5 bg-hunter-orange/10 neo-orange-border mb-8"
            >
              <span className="text-hunter-orange font-display font-black uppercase text-[10px] tracking-[0.3em] flex items-center gap-3">
                <Activity size={14} className="animate-pulse" /> Live Data: New Leads Just Added
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="font-display font-black text-6xl md:text-[10rem] uppercase leading-[0.75] mb-10 tracking-tighter"
            >
              FIND NEW <br />
              <span className="text-hunter-orange italic drop-shadow-[0_0_30px_rgba(255,102,0,0.3)]">CLIENTS DAILY.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="max-w-2xl text-lg md:text-2xl text-zinc-500 mb-12 font-bold uppercase tracking-wide leading-tight"
            >
              The simplest way to grow your business. <br className="hidden md:block" />
              Find real people who need your services right now.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-6 items-center"
            >
              <Link href="/register" className="group relative neo-orange-border bg-hunter-orange text-black px-12 py-6 font-display font-black uppercase text-xl flex items-center gap-4 hover:translate-x-[-4px] hover:translate-y-[-4px] transition-all shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_rgba(0,0,0,1)]">
                Find More Leads
                <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
              </Link>

              <div className="flex flex-col items-center gap-2">
                <Link href="/register?org=true" className="neo-border border-white/20 bg-white/5 backdrop-blur-sm text-white px-12 py-6 font-display font-black uppercase text-xl flex items-center gap-4 hover:bg-white/10 hover:border-hunter-orange transition-all shadow-[8px_8px_0px_rgba(255,255,255,0.05)]">
                  <Users size={24} className="text-hunter-orange" />
                  Run Your Agency
                </Link>
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600">Built for Teams</span>
              </div>
            </motion.div>
          </div>

          {/* Tactical Overlay */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-hunter-orange to-transparent opacity-20" />
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-hunter-orange to-transparent opacity-20" />
        </section>

        {/* Tactical Feed Preview */}
        <section className="px-6 py-20 bg-hunter-grey border-y-3 border-hunter-orange relative">
          <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
            {[
              {
                label: "Businesses Growing",
                value: "1,240+",
                detail: "Across the country"
              },
              {
                label: "Leads Found",
                value: "84.2K",
                detail: "In the last 24 hours"
              },
              {
                label: "Data Accuracy",
                value: "99.9%",
                detail: "Verified Daily"
              }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center md:items-start border-l-2 border-hunter-orange/30 pl-6">
                <span className="text-hunter-orange font-display font-black text-5xl mb-2">{stat.value}</span>
                <span className="text-xs font-black uppercase tracking-[0.3em] text-white mb-1">{stat.label}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{stat.detail}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Features Preview */}
        <section className="px-6 py-20">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-display font-black mb-12 uppercase text-center md:text-left">
              Our <span className="text-hunter-orange underline">Tools</span>
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: "Find Hidden Leads",
                  desc: "Search through the web to find people looking for your service.",
                  icon: Filter
                },
                {
                  title: "Smart Filtering",
                  desc: "We help you pick the best leads so you don't waste time.",
                  icon: Target
                },
                {
                  title: "Quick Exports",
                  desc: "Get your leads into your email or CRM in seconds.",
                  icon: Zap
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -10 }}
                  className="p-8 bg-hunter-grey neo-border border-zinc-800 hover:border-hunter-orange transition-colors group"
                >
                  <feature.icon className="w-12 h-12 text-zinc-700 group-hover:text-hunter-orange transition-colors mb-6" />
                  <h3 className="text-2xl font-display font-black mb-4 group-hover:text-hunter-orange">{feature.title}</h3>
                  <p className="text-zinc-500 font-medium leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="px-6 py-12 border-t-3 border-hunter-orange bg-hunter-black text-center">
        <span className="font-display font-black text-xl uppercase tracking-tighter">
          The Lead <span className="text-hunter-orange">Hunter</span> © 2026
        </span>
        <p className="text-zinc-600 text-xs mt-4 uppercase tracking-[0.2em] font-bold">
          Get more clients. Grow your business.
        </p>
      </footer>
    </div>
  );
}
