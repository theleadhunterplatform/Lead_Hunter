"use client";

import React, { useState, useEffect } from "react";
import { X, CheckCircle2, AlertCircle, Type, User, Loader2, Save, FileImage } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input } from "@/components/ui/HunterUI";
import api from "@/lib/api";

interface RefineLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lead: {
    _id: string;
    content: string;
    image_url?: string;
    keyword: string;
    author: {
      name: string;
    };
  } | null;
}

export default function RefineLeadModal({ isOpen, onClose, onSuccess, lead }: RefineLeadModalProps) {
  const [content, setContent] = useState("");
  const [keyword, setKeyword] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lead) {
      setContent(lead.content === "Manual Extraction Required" ? "" : lead.content);
      setKeyword(lead.keyword);
      setAuthorName(lead.author.name);
    }
  }, [lead]);

  const handleSave = async () => {
    if (!lead) return;
    if (!content.trim()) {
      setError("Please enter the extracted lead content");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.put(`/posts/${lead._id}`, {
        content: content.trim(),
        keyword: keyword.trim(),
        author: {
          ...lead.author,
          name: authorName.trim()
        },
        status: 'pending' // Move back to pending once refined
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update lead. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFullImageUrl = (url: string) => {
    if (!url) return "";
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '');
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${cleanUrl}`;
  };

  if (!isOpen || !lead) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-hunter-grey neo-border border-zinc-800 w-full max-w-5xl overflow-hidden flex flex-col md:flex-row h-[90vh]"
        >
          {/* Left: Source Image */}
          <div className="flex-1 bg-black/40 flex flex-col border-r border-zinc-800 relative">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileImage size={16} className="text-hunter-orange" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Source Evidence</span>
              </div>
              <a
                href={lead.image_url ? getFullImageUrl(lead.image_url) : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[8px] font-black uppercase tracking-widest text-hunter-orange hover:underline"
              >
                Open Full Res
              </a>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              {lead.image_url ? (
                <img
                  src={getFullImageUrl(lead.image_url)}
                  alt="Source"
                  className="max-w-full h-auto neo-border border-zinc-800 shadow-2xl"
                />
              ) : (
                <div className="text-zinc-600 text-xs uppercase font-black">No Image Attached</div>
              )}
            </div>
          </div>

          {/* Right: Transcription Form */}
          <div className="w-full md:w-[400px] flex flex-col bg-hunter-grey">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-display font-black uppercase tracking-tighter">Refine Lead</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Manual Data Entry</p>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase flex items-center gap-3">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <Type size={12} /> Extracted Content
                  </label>
                  <textarea
                    className="w-full h-48 bg-black/40 neo-border border-zinc-800 p-4 text-xs text-zinc-300 focus:border-hunter-orange transition-colors outline-none resize-none font-sans leading-relaxed"
                    placeholder="Type the lead description from the image..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <User size={12} /> Author Name
                  </label>
                  <Input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <CheckCircle2 size={12} /> Target Keyword
                  </label>
                  <Input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-black/20 border-t border-zinc-800">
              <Button
                onClick={handleSave}
                disabled={isSubmitting}
                className="w-full h-14 flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} /> Save & Validate
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
