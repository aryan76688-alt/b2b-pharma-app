import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireOwner(req);

    const result = await query(`
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (party_id) party_id, total_outstanding, pending_days
        FROM party_outstanding_snapshots
        ORDER BY party_id, snapshot_date DESC
      )
      SELECT 
        COALESCE(SUM(total_outstanding), 0) as "totalOutstanding",
        COALESCE(SUM(CASE WHEN pending_days = 0 THEN total_outstanding ELSE 0 END), 0) as "dueToday",
        COALESCE(SUM(CASE WHEN pending_days > 30 THEN total_outstanding ELSE 0 END), 0) as "overdue",
        COALESCE(SUM(CASE WHEN pending_days <= 30 THEN total_outstanding ELSE 0 END), 0) as "bucket0To30",
        COALESCE(SUM(CASE WHEN pending_days > 30 AND pending_days <= 60 THEN total_outstanding ELSE 0 END), 0) as "bucket31To60",
        COALESCE(SUM(CASE WHEN pending_days > 60 AND pending_days <= 90 THEN total_outstanding ELSE 0 END), 0) as "bucket61To90",
        COALESCE(SUM(CASE WHEN pending_days > 90 THEN total_outstanding ELSE 0 END), 0) as "bucket90Plus",
        COUNT(*) as "totalAccounts"
      FROM latest_snapshots
    `);

    const summary = result.rows[0];

    const agingBuckets = [
      { name: '0-30 Days', amount: Number(summary?.bucket0To30 || 0), color: '#12A86B' },
      { name: '31-60 Days', amount: Number(summary?.bucket31To60 || 0), color: '#1268E8' },
      { name: '61-90 Days', amount: Number(summary?.bucket61To90 || 0), color: '#F59E0B' },
      { name: '90+ Days', amount: Number(summary?.bucket90Plus || 0), color: '#E72B35' },
    ];

    return NextResponse.json({
      success: true,
      data: {
        totalOutstanding: Number(summary?.totalOutstanding || 0),
        dueToday: Number(summary?.dueToday || 0),
        overdue: Number(summary?.overdue || 0),
        totalAccounts: Number(summary?.totalAccounts || 0),
        agingBuckets,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
