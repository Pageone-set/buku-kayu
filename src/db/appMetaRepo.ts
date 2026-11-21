import { getDatabase } from './database';

export interface AppSettingsSnapshot {
  workshopName: string;
  lastBackupAt: string | null;
  autoBackupWifi: boolean;
}

export async function getSetting(key: string, fallback = ''): Promise<string> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    key
  );
  return row ? row.value : fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    key,
    value
  );
}

export async function getAppSettings(): Promise<AppSettingsSnapshot> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM app_settings'
  );
  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    workshopName: map.get('workshop_name') || 'Bengkel Kayu',
    lastBackupAt: map.get('last_backup_at') || null,
    autoBackupWifi: (map.get('auto_backup_wifi') ?? '1') === '1',
  };
}
