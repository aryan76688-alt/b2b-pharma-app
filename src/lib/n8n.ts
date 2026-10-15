/**
 * n8n Webhook Integration for Shreeji Healthcare Order Book & Dispatch
 * Triggers automated workflows (WhatsApp notifications, Google Sheets, Invoice Backup, SMS)
 */

export async function triggerN8nWebhook(event: string, payload: any) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/shreeji-events';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shreeji-Event': event,
      },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    return res.ok;
  } catch (err) {
    // Non-blocking: fail quietly if n8n service is idle or endpoint not registered
    return false;
  }
}
