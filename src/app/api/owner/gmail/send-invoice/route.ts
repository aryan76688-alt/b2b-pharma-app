import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';
import { getGDriveSettings, sendEmail } from '@/lib/gdrive';

export async function POST(req: NextRequest) {
  try {
    await requireOwner(req);
    const body = await req.json();
    const { order_id, to_email } = body;

    if (!order_id) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 });
    }

    const settings = await getGDriveSettings();
    if (!settings.webhook_url) {
      return NextResponse.json({ success: false, error: 'Google Apps Script Webhook URL is not configured' }, { status: 400 });
    }

    // Query order and party
    const orderRes = await query(
      `SELECT o.*, p.party_name, p.party_code, p.email as party_email, p.mobile as party_mobile, p.city, p.address
       FROM orders o
       JOIN parties p ON o.party_id = p.id
       WHERE o.id = $1`,
      [order_id]
    );

    if (orderRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const order = orderRes.rows[0];

    // Query items
    const itemsRes = await query(
      `SELECT oi.*, p.name as product_name, p.packing
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [order_id]
    );

    const items = itemsRes.rows;
    const recipientEmail = to_email || order.party_email || settings.notify_email || 'shreejiseven@gmail.com';

    let itemsHtml = '';
    for (const item of items) {
      itemsHtml += `
      <tr>
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${item.product_name} <span style="font-weight: normal; color: #64748b;">(${item.packing || '1x10'})</span></td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">₹${Number(item.ptr || item.rate || 0).toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">₹${Number(item.line_total || (item.quantity * (item.ptr || 0))).toFixed(2)}</td>
      </tr>
      `;
    }

    const orderDate = new Date(order.order_date || order.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const subject = `Tax Invoice / Order Confirmation: #${order.order_number || order.id} - ${order.party_name}`;
    const bodyHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #2563eb; color: #ffffff; padding: 20px;">
        <h2 style="margin: 0;">SHREEJI HEALTHCARE</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Wholesale Pharmaceutical Distributor • Dehgam, Gujarat</p>
      </div>
      <div style="padding: 24px; color: #1e293b;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <h3 style="margin: 0 0 4px 0; color: #0f172a;">${order.party_name}</h3>
            <p style="margin: 0; font-size: 13px; color: #64748b;">${order.address || ''}, ${order.city || ''}</p>
            <p style="margin: 2px 0 0 0; font-size: 13px; color: #64748b;">Phone: ${order.party_mobile || '-'}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-weight: bold; font-size: 14px;">Order #${order.order_number || order.id}</p>
            <p style="margin: 2px 0 0 0; font-size: 13px; color: #64748b;">Date: ${orderDate}</p>
            <p style="margin: 2px 0 0 0; font-size: 13px; font-weight: bold; color: #2563eb;">Status: ${order.status || 'CONFIRMED'}</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
          <thead>
            <tr style="background: #f8fafc; text-align: left; color: #475569;">
              <th style="padding: 8px; border: 1px solid #e2e8f0;">Product Name</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">Qty</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Rate (PTR)</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: bold; font-size: 14px;">
              <td colspan="3" style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">Total Amount:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; color: #16a34a;">₹${Number(order.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>

        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 30px;">
          This is an automated invoice dispatch generated by Shreeji Healthcare Order Management System.
        </p>
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
      response: sendRes
    });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
