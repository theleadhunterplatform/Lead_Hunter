"use client";

import { useEffect, useState } from "react";
import { X, Loader2, ClipboardPaste } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input } from "@/components/ui/HunterUI";
import api from "@/lib/api";
import { toast } from "sonner";

interface ManualContactLead {
  _id: string;
  author?: { name?: string };
  email?: string;
  contact_info?: {
    phone_numbers?: { number: string }[];
  };
}

interface ManualContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lead: ManualContactLead | null;
}

export default function ManualContactModal({
  isOpen,
  onClose,
  onSuccess,
  lead,
}: ManualContactModalProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("Found manually on ContactOut");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !lead) return;
    setEmail(lead.email || "");
    setPhone(lead.contact_info?.phone_numbers?.[0]?.number || "");
    setNote("Found manually on ContactOut");
  }, [isOpen, lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedEmail && !trimmedPhone) {
      toast.error("Enter at least an email or phone number.");
      return;
    }

    try {
      setIsSaving(true);
      const response = await api.put(`/posts/${lead._id}/manual-contact`, {
        email: trimmedEmail || undefined,
        phone: trimmedPhone || undefined,
        note: note.trim() || undefined,
      });
      toast.success(response.data.message || "Contact saved.");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save contact.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!lead) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative w-full max-w-md bg-hunter-grey neo-border border-zinc-800 p-6"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardPaste size={16} className="text-hunter-orange" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-hunter-orange">
                    Manual Contact
                  </span>
                </div>
                <h2 className="text-xl font-display font-black uppercase text-white">
                  {lead.author?.name || "Lead"}
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Paste email/phone from ContactOut to save API tokens.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-zinc-500 hover:text-white"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">
                  Phone
                </label>
                <Input
                  type="tel"
                  placeholder="+1 555 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">
                  Note (optional)
                </label>
                <Input
                  placeholder="Source or context"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  className="flex-1"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Contact"
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
