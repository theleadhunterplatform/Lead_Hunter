"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Compass, ArrowLeft, Target } from "lucide-react";
import { Button } from "@/components/ui/HunterUI";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-hunter-black flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background Cinematic Elements */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-hunter-orange rounded-full animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-zinc-800 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-zinc-900 rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10"
      >
        <div className="inline-flex items-center justify-center w-24 h-24 mb-8 bg-hunter-grey neo-border border-zinc-800 text-hunter-orange">
          <Compass size={48} className="animate-spin-slow" />
        </div>

        <h1 className="text-8xl md:text-9xl font-display font-black uppercase italic leading-none mb-4">
          4<span className="text-hunter-orange">0</span>4
        </h1>

        <h2 className="text-2xl md:text-3xl font-display font-black uppercase tracking-tighter mb-6">
          Page <span className="text-hunter-orange">Not Found.</span>
        </h2>

        <p className="text-zinc-500 font-bold uppercase text-xs tracking-[0.3em] max-w-md mx-auto mb-12 leading-relaxed">
          We couldn't find the page you're looking for.
          Let's get you back to your dashboard to continue finding leads.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 p-2 bg-white/5 backdrop-blur-md neo-border border-white/5 rounded-sm"
        >
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto px-10 h-14 text-lg group relative overflow-hidden">
              <span className="relative z-10 flex items-center justify-center">
                <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={20} />
                Go to Dashboard
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Button>
          </Link>

          <Link href="/leads/relevant" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto px-10 h-14 text-lg group hover:border-hunter-orange transition-all duration-300">
              <span className="flex items-center justify-center">
                <Target className="mr-2 group-hover:scale-110 transition-transform" size={20} />
                View Leads
              </span>
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
