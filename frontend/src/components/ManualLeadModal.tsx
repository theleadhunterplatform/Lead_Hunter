"use client";

import React, { useState, useRef } from "react";
import { X, Upload, ImageIcon, Loader2, Type, User, CheckCircle2, AlertCircle, FileStack } from "lucide-react";
import { LinkedinLogo, XLogo, RedditLogo, ThreadsLogo } from "@/components/BrandIcons";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input } from "@/components/ui/HunterUI";
import api from "@/lib/api";

interface ManualLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UploadResult {
  success: boolean;
  filename: string;
  message?: string;
  extractedText?: string;
}

export default function ManualLeadModal({ isOpen, onClose, onSuccess }: ManualLeadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [platform, setPlatform] = useState("manual");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<UploadResult[] | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addFiles(files);
    }
  };

  const addFiles = (files: File[]) => {
    setError(null);
    const validFiles = files.filter(file => file.size <= 5 * 1024 * 1024);
    
    if (validFiles.length < files.length) {
      setError("Some files were skipped because they exceed the 5MB limit.");
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one image");
      return;
    }

    setIsUploading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append("images", file);
    });
    formData.append("keyword", keyword || "Manual Bulk Upload");
    formData.append("platform", platform);
    if (authorName) formData.append("authorName", authorName);

    try {
      const response = await api.post("/posts/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setResults(response.data.results);
      
      if (response.data.count > 0) {
        // Success for at least some images
        setTimeout(() => {
          onSuccess();
          resetForm();
        }, 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to process images. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    previews.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviews([]);
    setKeyword("");
    setAuthorName("");
    setPlatform("manual");
    setError(null);
    setResults(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-hunter-grey neo-border border-zinc-800 w-full max-w-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-hunter-orange/10 flex items-center justify-center neo-border border-hunter-orange/30">
                <FileStack className="text-hunter-orange" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-display font-black uppercase tracking-tighter">Bulk Lead Ingestion</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Image OCR Pipeline</p>
              </div>
            </div>
            <button onClick={resetForm} className="text-zinc-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center gap-3">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {results ? (
              <div className="py-12 flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center neo-border border-green-500/30">
                  <CheckCircle2 className="text-green-500" size={40} />
                </div>
                <div>
                  <h3 className="text-2xl font-display font-black uppercase tracking-tighter mb-2">Batch Queued!</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest max-w-[280px] mx-auto">
                    We've received your {selectedFiles.length} images. They are being processed in the background and will appear in your leads list shortly.
                  </p>
                </div>
                <div className="pt-4">
                  <Button onClick={resetForm} className="px-12">
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Multi-Dropzone */}
                <div 
                  className="neo-border border-zinc-800 border-dashed bg-black/20 p-8 text-center cursor-pointer hover:border-hunter-orange/50 transition-all group"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = Array.from(e.dataTransfer.files);
                    addFiles(files);
                  }}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    multiple
                    onChange={handleFileChange}
                  />
                  
                  {previews.length > 0 ? (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                      {previews.map((preview, index) => (
                        <div key={index} className="relative aspect-square group/preview">
                          <img src={preview} alt="preview" className="w-full h-full object-cover neo-border border-zinc-800" />
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/preview:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      <div className="aspect-square flex flex-col items-center justify-center neo-border border-zinc-800 border-dashed hover:border-hunter-orange transition-colors">
                        <Upload size={20} className="text-zinc-600 mb-2" />
                        <span className="text-[8px] font-black uppercase text-zinc-500">Add More</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="text-zinc-500 group-hover:text-hunter-orange" />
                      </div>
                      <p className="text-sm font-bold uppercase tracking-widest text-white mb-1">Upload Bulk Screenshots</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-black">Click or Drag Multiple Images (Max 5MB each)</p>
                    </div>
                  )}
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <Type size={12} /> Batch Keyword (Optional)
                    </label>
                    <Input 
                      placeholder="e.g. SEO Leads" 
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <User size={12} /> Author Prefix (Optional)
                    </label>
                    <Input 
                      placeholder="e.g. Unknown Author" 
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Platform Selector */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    Source Platform
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "manual", label: "General/Manual" },
                      { id: "linkedin", label: "LinkedIn" },
                      { id: "twitter", label: "Twitter" },
                      { id: "reddit", label: "Reddit" },
                      { id: "threads", label: "Threads" }
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPlatform(p.id)}
                        className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest neo-border transition-all flex items-center gap-2 ${platform === p.id 
                          ? 'bg-hunter-orange text-black border-black' 
                          : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-500'}`}
                      >
                        {p.id === 'linkedin' && <LinkedinLogo className="w-3 h-3" />}
                        {p.id === 'twitter' && <XLogo className="w-3 h-3" />}
                        {p.id === 'reddit' && <RedditLogo className="w-3 h-3" />}
                        {p.id === 'threads' && <ThreadsLogo className="w-3 h-3" />}
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-black/40 border-t border-zinc-800 flex gap-4">
            <Button variant="secondary" onClick={onClose} disabled={isUploading} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={isUploading || selectedFiles.length === 0 || results !== null}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Processing Batch...
                </>
              ) : (
                <>
                  <FileStack size={18} />
                  Process {selectedFiles.length} {selectedFiles.length === 1 ? 'Lead' : 'Leads'}
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
