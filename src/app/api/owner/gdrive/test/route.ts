import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { getGDriveSettings, testGDriveConnection } from '@/lib/gdrive';

export async function POST(req: NextRequest) {
  try {
    await requireOwner(req);
    const body = await req.json().catch(() => ({}));
    const settings = await getGDriveSettings();
    const webhookUrl = body.webhook_url || settings.webhook_url;
    const apiKey = body.api_key || settings.api_key;

    if (!webhookUrl) {
      return NextResponse.json({ success: false, error: 'Webhook URL is not configured' }, { status: 400 });
    }

    const res = await testGDriveConnection(webhookUrl, apiKey);
    return NextResponse.json(res);
  } catch (error: any) {
    return handleAuthError(error);
  }
}
