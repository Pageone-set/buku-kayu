import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getAppSettings, setSetting } from '../db/appMetaRepo';
import { useAppStore } from '../store/useAppStore';
import { getLocalTimestampIso } from '../utils/formatters';
import {
  createDatabaseSnapshotFile,
  replaceDatabaseWithFile,
} from './googleDriveService';

export async function exportLocalBackupToShare(): Promise<{
  fileName: string;
  backupTimeIso: string;
}> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Fitur bagikan file tidak tersedia di perangkat ini.');
  }

  const stamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace('T', '_')
    .replace(':', '');
  const fileName = `bukukayu_cadangan_${stamp}.db`;
  const snapshotFile = await createDatabaseSnapshotFile(fileName);

  try {
    await Sharing.shareAsync(snapshotFile.uri, {
      mimeType: 'application/octet-stream',
      dialogTitle: 'Simpan atau Kirim File Cadangan BukuKayu (.db)',
    });

    const backupTimeIso = getLocalTimestampIso();
    await setSetting('last_backup_at', backupTimeIso);
    useAppStore.getState().setLastBackupAt(backupTimeIso);

    return { fileName, backupTimeIso };
  } finally {
    if (snapshotFile.exists) {
      try {
        snapshotFile.delete();
      } catch {
        // Abaikan kegagalan hapus cache sementara
      }
    }
  }
}

export async function restoreLocalBackupFromPicker(): Promise<
  { canceled: true } | { canceled: false; fileName: string }
> {
  const picked = await File.pickFileAsync({
    multipleFiles: false,
    mimeTypes: '*/*',
  });

  if (picked.canceled || !picked.result) {
    return { canceled: true };
  }

  const tempCopy = new File(
    Paths.cache,
    `bukukayu_local_restore_${Date.now()}.db`
  );

  try {
    await picked.result.copy(tempCopy, { overwrite: true });
    await replaceDatabaseWithFile(tempCopy);

    const store = useAppStore.getState();
    const settings = await getAppSettings();
    store.setWorkshopName(settings.workshopName);
    store.setLastBackupAt(settings.lastBackupAt);
    store.setAutoBackupWifi(settings.autoBackupWifi);
    store.bumpDbRevision(false);
    store.setSyncState('IDLE', 'Data berhasil dipulihkan dari file HP.');

    return {
      canceled: false,
      fileName: picked.result.name || 'cadangan.db',
    };
  } finally {
    if (tempCopy.exists) {
      try {
        tempCopy.delete();
      } catch {
        // ignore
      }
    }
  }
}
