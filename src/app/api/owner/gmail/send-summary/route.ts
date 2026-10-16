import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';
import { getGDriveSettings, sendEmail } from '@/lib/gdrive';

export async function POST(req: NextRequest) {
  try {
    await requireOwner(req);
    const body = await req.json().catch(() => ({}));
    const { limit = 30, to_email } = body;

    const settings = await getGDriveSettings();
    if (!settings.webhook_url) {
      return NextResponse.json({ success: false, error: 'Google Apps Script Webhook URL is not configured' }, { status: 400 });
    }

    const recipientEmail = to_email || settings.notify_email || 'shreejiseven@gmail.com';

    const ordersRes = await query(
      `SELECT o.*, p.party_name, p.city, u.full_name as salesman_name
       FROM orders o
       JOIN parties p ON o.party_id = p.id
       LEFT JOIN users u ON o.salesman_id = u.id
       ORDER BY o.order_date DESC
       LIMIT $1`,
      [limit]
    );

    const orders = ordersRes.rows;
    let rowsHtml = '';
    let totalSales = 0;

    for (const ord of orders) {
      const amt = Number(ord.total_amount || 0);
      totalSales += amt;
      const dStr = new Date(ord.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      rowsHtml += `
      <tr>
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 12px;">${dStr}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; font-size: 13px;">${ord.party_name}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 12px;">${ord.city || '-'}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 12px;">${ord.salesman_name || 'Direct'}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; font-size: 11px;">
          <span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${ord.status}</span>
        </td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; font-size: 13px;">₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
      `;
    }

    const subject = `Daily Order Book Summary (${orders.length} orders - ₹${totalSales.toLocaleString('en-IN')}) - Shreeji Healthcare`;
    const bodyHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 750px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #0f172a; color: #ffffff; padding: 20px;">
        <h2 style="margin: 0;">SHREEJI HEALTHCARE - Daily Order Summary</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">
          Showing latest ${orders.length} orders • Cumulative Total: <strong style="color: #4ade80;">₹${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
        </p>
      </div>
      <div style="padding: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f1f5f9; text-align: left; font-size: 12px; color: #475569;">
              <th style="padding: 8px; border: 1px solid #e2e8f0;">Date</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0;">Chemist / Party</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0;">City</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0;">Salesman</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">Status</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
    `;

    const sendRes = await sendEmail(
      settings.webhook_url,
      settings.api_key,
      recipientEmail,
      subject,
      bodyHtml
    );

    return NextResponse.json({
      success: sendRes.success ?? false,
      recipient: recipientEmail,
      order_count: orders.length,
      total_sales: totalSales
    });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
