'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ShieldCheck, User, Clock, FileSpreadsheet, Lock } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { AuditLog } from '@/types';

export default function OwnerAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setLogs(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <AppShell title="Security & Audit Trail">
      <div className="space-y-4 max-w-5xl mx-auto animate-fade-in">
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              Administrative & Financial Action Trails
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs">Loading audit trails...</div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">No audit logs found.</div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">User</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Entity Type</th>
                      <th className="p-3">Details / IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-500 font-mono whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="p-3 font-semibold text-slate-900">
                          {log.userName || 'System'}
                        </td>
                        <td className="p-3">
                          <span className="font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[10px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 font-semibold">{log.entityType}</td>
                        <td className="p-3 text-slate-500 max-w-sm truncate">
                          {log.newData ? JSON.stringify(log.newData) : log.ipAddress || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
