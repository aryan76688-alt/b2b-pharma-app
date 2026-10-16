'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers';
import { 
  ShieldCheck, 
  Smartphone, 
  Database, 
  Cloud, 
  Mail, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Lock,
  Download
} from 'lucide-react';

interface BackupItem {
  id: string;
  name: string;
  size: number;
  createdTime: string;
}

export default function OwnerSettingsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner' || user?.role === 'super_admin' || user?.role === 'admin';

  // Google Drive & Gmail Webhook State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiKey, setApiKey] = useState('SHREEJI_SECRET_KEY_2026');
  const [folderName, setFolderName] = useState('Shreeji_Healthcare_Backups');
  const [notifyEmail, setNotifyEmail] = useState('shreejiseven@gmail.com');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isEmailingSummary, setIsEmailingSummary] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/owner/gdrive/settings');
      if (res.ok) {
        const json = await res.json();
        if (json.settings) {
          if (json.settings.webhook_url) setWebhookUrl(json.settings.webhook_url);
          if (json.settings.api_key) setApiKey(json.settings.api_key);
          if (json.settings.folder_name) setFolderName(json.settings.folder_name);
          if (json.settings.notify_email) setNotifyEmail(json.settings.notify_email);
        }
      }
    } catch (err) {
      console.warn('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/owner/gdrive/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook_url: webhookUrl,
          api_key: apiKey,
          folder_name: folderName,
          notify_email: notifyEmail
        })
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg({ type: 'success', text: 'Google Drive & Gmail Webhook settings saved!' });
        setTimeout(() => setStatusMsg(null), 4000);
      } else {
        setStatusMsg({ type: 'error', text: json.error || 'Failed to save settings' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/owner/gdrive/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: webhookUrl, api_key: apiKey })
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg({ type: 'success', text: json.message || 'Connected to Google Apps Script Webhook successfully!' });
      } else {
        setStatusMsg({ type: 'error', text: json.error || 'Connection failed' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/owner/gdrive/backup', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setStatusMsg({
          type: 'success',
          text: `Backup successful: ${json.filename} (${json.size_kb} KB) uploaded to Google Drive!`
        });
        handleLoadBackups();
      } else {
        setStatusMsg({ type: 'error', text: json.error || 'Backup upload failed' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleLoadBackups = async () => {
    setLoadingBackups(true);
    try {
      const res = await fetch('/api/owner/gdrive/backup');
      const json = await res.json();
      if (json.success && json.backups) {
        setBackups(json.backups);
      } else {
        alert(json.error || 'Could not fetch backups from Google Drive');
      }
    } catch (err: any) {
      alert('Error fetching backups: ' + err.message);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleRestoreBackup = async (fileId: string, filename: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to restore "${filename}" from Google Drive?\n\nThis will safely merge/restore parties and products into your database.`
    );
    if (!confirmed) return;

    setRestoringId(fileId);
    try {
      const res = await fetch('/api/owner/gdrive/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId })
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message || 'Backup restored successfully!');
      } else {
        alert('Restore failed: ' + (json.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Restore failed: ' + err.message);
    } finally {
      setRestoringId(null);
    }
  };

  const handleSendSummaryEmail = async () => {
    setIsEmailingSummary(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/owner/gmail/send-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 30, to_email: notifyEmail })
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg({
          type: 'success',
          text: `Daily Order Summary (${json.order_count} orders) emailed to ${json.recipient}!`
        });
      } else {
        setStatusMsg({ type: 'error', text: json.error || 'Failed to send summary email' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsEmailingSummary(false);
    }
  };

  return (
    <AppShell title="System & Business Settings">
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
        {/* Business Profile */}
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              Company & Distributor Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative w-36 h-16 border rounded-xl p-1 bg-white">
                <Image
                  src="/logo.png"
                  alt="Shreeji Healthcare"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">SHREEJI HEALTHCARE</h3>
                <p className="text-xs text-slate-500">“A Unit of Shreeji 7” • Wholesale Pharma Distributor</p>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200 mt-1 inline-block">
                  Verified Pharmaceutical License
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Headquarters</span>
                <span className="font-bold text-slate-800">Ahmedabad, Gujarat, India</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px]">GSTIN Number</span>
                <span className="font-bold text-slate-800 font-mono">24AAAAA0000A1Z5</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GOOGLE DRIVE & GMAIL WEBHOOK CARD */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 via-white to-sky-50/40">
          <CardHeader className="border-b border-blue-100/60 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-extrabold text-slate-900">
                      Google Drive Auto-Sync & 1-Click Gmail
                    </CardTitle>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 uppercase tracking-wide">
                      Zero OAuth2
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Automated cloud backup to Google Drive & instant Gmail dispatch via Google Apps Script Webhook.
                  </p>
                </div>
              </div>

              {isOwner ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Owner Access
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  Restricted
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-xs">
            {statusMsg && (
              <div className={`p-3 rounded-xl border flex items-center gap-2 font-bold animate-fade-in ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {statusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="font-extrabold text-slate-700 block mb-1 flex items-center justify-between">
                  <span>Google Apps Script Webhook URL:</span>
                  <span className="text-[10px] text-blue-600 font-semibold">Script in scripts/google/GoogleSyncWebhook.gs</span>
                </label>
                <input
                  type="url"
                  disabled={!isOwner}
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-xs text-slate-800 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Secret API Key (apiKey):</label>
                <input
                  type="password"
                  disabled={!isOwner}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="SHREEJI_SECRET_KEY_2026"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-xs text-slate-800 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Google Drive Folder Name:</label>
                <input
                  type="text"
                  disabled={!isOwner}
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Shreeji_Healthcare_Backups"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-xs text-slate-800 disabled:bg-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-extrabold text-slate-700 block mb-1">Default Gmail Notification / Dispatch Recipient:</label>
                <input
                  type="email"
                  disabled={!isOwner}
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="shreejiseven@gmail.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-xs text-slate-800 disabled:bg-slate-100"
                />
              </div>
            </div>

            {isOwner && (
              <div className="pt-2 border-t border-blue-100 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSaving}
                  onClick={handleSaveSettings}
                  className="text-xs"
                >
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={isTesting || !webhookUrl}
                  onClick={handleTestConnection}
                  className="text-xs text-blue-700 border-blue-300 hover:bg-blue-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isTesting ? 'animate-spin' : ''}`} />
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </Button>

                <Button
                  size="sm"
                  disabled={isBackingUp || !webhookUrl}
                  onClick={handleBackupNow}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  <Cloud className={`w-3.5 h-3.5 mr-1 ${isBackingUp ? 'animate-spin' : ''}`} />
                  {isBackingUp ? 'Backing Up...' : 'Backup Database to GDrive'}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={loadingBackups || !webhookUrl}
                  onClick={handleLoadBackups}
                  className="text-xs text-slate-700 border-slate-300 hover:bg-slate-100"
                >
                  <Database className="w-3.5 h-3.5 mr-1" />
                  {loadingBackups ? 'Fetching...' : 'Browse Cloud Backups'}
                </Button>

                <Button
                  size="sm"
                  disabled={isEmailingSummary || !webhookUrl}
                  onClick={handleSendSummaryEmail}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <Mail className={`w-3.5 h-3.5 mr-1 ${isEmailingSummary ? 'animate-spin' : ''}`} />
                  {isEmailingSummary ? 'Sending...' : 'Email Orders Summary to Gmail'}
                </Button>
              </div>
            )}

            {/* Backups List */}
            {backups.length > 0 && (
              <div className="mt-4 pt-3 border-t border-blue-100 space-y-2">
                <h5 className="font-extrabold text-slate-800 text-xs flex items-center justify-between">
                  <span>Google Drive Cloud Backups ({backups.length}):</span>
                  <span className="text-[10px] text-slate-500 font-normal">Pre-restore safety snapshot included</span>
                </h5>
                <div className="overflow-x-auto max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="p-2 font-bold">Filename</th>
                        <th className="p-2 font-bold">Date & Time</th>
                        <th className="p-2 font-bold text-right">Size</th>
                        <th className="p-2 font-bold text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backups.map((bk) => (
                        <tr key={bk.id} className="border-b border-slate-100 hover:bg-blue-50/40">
                          <td className="p-2 font-bold text-slate-800 font-mono text-[11px]">{bk.name}</td>
                          <td className="p-2 text-slate-500 text-[11px]">
                            {bk.createdTime ? new Date(bk.createdTime).toLocaleString() : '-'}
                          </td>
                          <td className="p-2 text-slate-600 text-right font-mono text-[11px]">
                            {bk.size ? `${(bk.size / 1024).toFixed(1)} KB` : 'N/A'}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              size="sm"
                              disabled={restoringId === bk.id}
                              onClick={() => handleRestoreBackup(bk.id, bk.name)}
                              className="text-[11px] h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {restoringId === bk.id ? 'Restoring...' : 'Restore'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database & PWA Info */}
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              System Architecture & Infrastructure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="flex items-center gap-2 font-medium">
                <Database className="w-4 h-4 text-shreeji-blue" />
                PostgreSQL Database (Supabase Compatible)
              </span>
              <span className="text-emerald-700 font-bold">Connected (18 Tables)</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="flex items-center gap-2 font-medium">
                <Smartphone className="w-4 h-4 text-shreeji-green" />
                Progressive Web App (PWA) Offline Shell
              </span>
              <span className="text-emerald-700 font-bold">Enabled</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="flex items-center gap-2 font-medium">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Device Session & Offline Sync
              </span>
              <span className="text-emerald-700 font-bold">Active</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
