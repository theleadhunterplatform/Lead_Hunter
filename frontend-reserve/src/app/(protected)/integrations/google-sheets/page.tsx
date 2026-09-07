"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { Button, Input } from "@/components/ui/HunterUI";

type GoogleSheetsStatus = {
  connected: boolean;
  email: string | null;
  spreadsheet_id: string | null;
  sheet_name: string | null;
};

const DEFAULT_TAB = "Lead_Hunter_Export";

export default function GoogleSheetsIntegrationPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<GoogleSheetsStatus | null>(null);
  const [sheetInput, setSheetInput] = useState("");
  const [sheetName, setSheetName] = useState(DEFAULT_TAB);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const oauthMessage = useMemo(() => {
    const oauthStatus = searchParams.get("status");
    const oauthError = searchParams.get("message");
    if (!oauthStatus) return null;
    if (oauthStatus === "connected") return "Google account connected successfully.";
    return oauthError || "Google OAuth failed. Please try again.";
  }, [searchParams]);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/google-sheets/status");
      const payload = data.data as GoogleSheetsStatus;
      setStatus(payload);
      if (payload.spreadsheet_id) setSheetInput(payload.spreadsheet_id);
      if (payload.sheet_name) setSheetName(payload.sheet_name);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load Google Sheets status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (oauthMessage) setMessage(oauthMessage);
  }, [oauthMessage]);

  const connectGoogle = async () => {
    setError(null);
    setMessage(null);
    try {
      const { data } = await api.get("/google-sheets/connect");
      const authUrl = data?.data?.auth_url;
      if (!authUrl) throw new Error("Missing auth URL");
      window.location.href = authUrl;
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to start Google OAuth.");
    }
  };

  const saveSheetConfig = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { data } = await api.post("/google-sheets/config", {
        spreadsheet_url: sheetInput,
        sheet_name: sheetName || DEFAULT_TAB,
      });
      setMessage(data.message || "Google Sheet configuration saved.");
      await fetchStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save sheet configuration.");
    } finally {
      setSaving(false);
    }
  };

  const exportClaims = async () => {
    setExporting(true);
    setError(null);
    setMessage(null);
    try {
      const { data } = await api.post("/google-sheets/export");
      const payload = data.data || {};
      setMessage(
        `Export completed. Exported: ${payload.exported ?? 0}, skipped: ${payload.skipped ?? 0}.`
      );
    } catch (err: any) {
      setError(err.response?.data?.error || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const disconnect = async () => {
    setError(null);
    setMessage(null);
    try {
      await api.post("/google-sheets/disconnect");
      setMessage("Google Sheets disconnected.");
      setSheetInput("");
      setSheetName(DEFAULT_TAB);
      await fetchStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to disconnect Google Sheets.");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <h1 className="font-display font-black text-3xl uppercase tracking-tight mb-2">
        Google Sheets Integration
      </h1>
      <p className="text-zinc-400 text-sm mb-8">
        Connect your Google account, choose your sheet, and export claimed leads.
      </p>

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : (
        <div className="space-y-6">
          <div className="neo-border border-zinc-800 bg-hunter-grey p-5">
            <p className="text-xs uppercase font-bold tracking-wider text-zinc-400 mb-2">
              Connection Status
            </p>
            <p className="text-sm">
              {status?.connected ? "Connected" : "Not connected"}{" "}
              {status?.email ? `as ${status.email}` : ""}
            </p>
            <div className="mt-4 flex gap-3">
              <Button onClick={connectGoogle} type="button">
                {status?.connected ? "Reconnect Google" : "Connect Google"}
              </Button>
              {status?.connected && (
                <Button type="button" variant="outline" onClick={disconnect}>
                  Disconnect
                </Button>
              )}
            </div>
          </div>

          <div className="neo-border border-zinc-800 bg-hunter-grey p-5 space-y-4">
            <Input
              label="Google Sheet URL or Spreadsheet ID"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetInput}
              onChange={(e) => setSheetInput(e.target.value)}
            />
            <Input
              label="Tab Name"
              placeholder={DEFAULT_TAB}
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
            />
            <div className="flex gap-3">
              <Button type="button" onClick={saveSheetConfig} disabled={saving || !status?.connected}>
                {saving ? "Saving..." : "Save Sheet"}
              </Button>
              <Button
                type="button"
                onClick={exportClaims}
                disabled={exporting || !status?.connected || !sheetInput}
              >
                {exporting ? "Exporting..." : "Export Claimed Leads"}
              </Button>
            </div>
          </div>

          {message && (
            <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-400 px-4 py-3 text-sm">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 text-sm">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
