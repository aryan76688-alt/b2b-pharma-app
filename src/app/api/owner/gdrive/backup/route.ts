import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { getGDriveSettings, saveGDriveSettings, createDatabaseBackupArchive, uploadBackup, listBackups } from '@/lib/gdrive';

export async function POST(req: NextRequest) {
  try {
    await requireOwner(req);
    const settings = await getGDriveSettings();
    if (!settings.webhook_url) {
      return NextResponse.json({ success: false, error: 'Google Drive Webhook URL is not configured' }, { status: 400 });
    }

    const { filename, buffer, counts } = await createDatabaseBackupArchive();
    const uploadRes = await uploadBackup(
      settings.webhook_url,
      settings.api_key,
      filename,
      buffer,
      'application/gzip',
      settings.folder_name
    );

    const now = new Date().toISOString();
    if (uploadRes.success) {
      await saveGDriveSettings({
        last_backup_time: now,
        last_backup_status: `Success: ${filename} uploaded to Google Drive`
      });
    } else {
      await saveGDriveSettings({
        last_backup_time: now,
        last_backup_status: `Failed: ${uploadRes.error || 'Upload error'}`
      });
    }

    return NextResponse.json({
      success: uploadRes.success ?? false,
      filename,
      size_kb: Math.round(buffer.length / 1024),
      counts,
      gdrive_response: uploadRes
    });
  } catch (error: any) {
    return handleAuthError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireOwner(req);
    const settings = await getGDriveSettings();
    if (!settings.webhook_url) {
      return NextResponse.json({ success: false, error: 'Google Drive Webhook URL is not configured' }, { status: 400 });
    }

    const res = await listBackups(settings.webhook_url, settings.api_key, settings.folder_name);
    return NextResponse.json(res);
  } catch (error: any) {
    return handleAuthError(error);
  }
}
