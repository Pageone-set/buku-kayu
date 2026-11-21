import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { getAppSettings } from '../db/appMetaRepo';
import { useAppStore } from '../store/useAppStore';
import { DriveBackupFileInfo, GoogleUserProfile } from '../types/domain';
import {
  BACKUP_FILE_NAME,
  backupDatabaseToDrive,
  findBackupFile,
  restoreDatabaseFromDrive,
  signInGoogle,
  signOutGoogle,
} from './googleDriveService';

const AUTO_BACKUP_COOLDOWN_MS = 30_000;
let lastAutoBackupAttemptMs = 0;

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export async function checkCloudBackupExists(): Promise<DriveBackupFileInfo | null> {
  const store = useAppStore.getState();
  if (!store.googleUser) {
    return null;
  }
  const info = await findBackupFile();
  store.setCloudBackupInfo(info);
  return info;
}

export async function connectGoogleAccount(): Promise<{
  user: GoogleUserProfile;
  existingBackup: DriveBackupFileInfo | null;
}> {
  const store = useAppStore.getState();
  const user = await signInGoogle();
  store.setGoogleUser(user);
  store.setSyncState('IDLE', null);

  let existingBackup: DriveBackupFileInfo | null = null;
  try {
    existingBackup = await findBackupFile();
    store.setCloudBackupInfo(existingBackup);
  } catch {
    // Tetap lanjut meski cek file gagal sementara (misal jaringan lambat)
  }

  return { user, existingBackup };
}

export async function disconnectGoogleAccount(): Promise<void> {
  const store = useAppStore.getState();
  await signOutGoogle();
  store.setGoogleUser(null);
  store.setCloudBackupInfo(null);
  store.setSyncState('IDLE', null);
}

export async function performManualBackup(): Promise<{
  fileId: string;
  backupTimeIso: string;
  sizeBytes: number;
}> {
  const store = useAppStore.getState();
  if (!store.googleUser) {
    throw new Error('Silakan masuk ke akun Google terlebih dahulu.');
  }
  if (store.syncStatus === 'BACKING_UP' || store.syncStatus === 'RESTORING') {
    throw new Error('Proses sinkronisasi sedang berjalan.');
  }

  store.setSyncState('BACKING_UP', 'Sedang mencadangkan database ke Google Drive...');

  try {
    const result = await backupDatabaseToDrive();
    store.markSynced(result.backupTimeIso);
    store.setCloudBackupInfo({
      id: result.fileId,
      name: BACKUP_FILE_NAME,
      modifiedTime: result.backupTimeIso,
      size: result.sizeBytes,
    });
    return result;
  } catch (error) {
    const msg = extractErrorMessage(error, 'Gagal mencadangkan data ke Google Drive.');
    store.setSyncState('ERROR', msg);
    throw new Error(msg);
  }
}

export async function performRestoreFromDrive(fileId?: string): Promise<void> {
  const store = useAppStore.getState();
  if (!store.googleUser) {
    throw new Error('Silakan masuk ke akun Google terlebih dahulu.');
  }
  if (store.syncStatus === 'BACKING_UP' || store.syncStatus === 'RESTORING') {
    throw new Error('Proses sinkronisasi sedang berjalan.');
  }

  store.setSyncState('RESTORING', 'Sedang mengunduh dan memulihkan data...');

  try {
    await restoreDatabaseFromDrive(fileId);
    const settings = await getAppSettings();
    store.setWorkshopName(settings.workshopName);
    store.setLastBackupAt(settings.lastBackupAt);
    store.setAutoBackupWifi(settings.autoBackupWifi);
    store.bumpDbRevision(false);
    store.setSyncState('IDLE', 'Data berhasil dipulihkan dari Google Drive.');
  } catch (error) {
    const msg = extractErrorMessage(error, 'Gagal memulihkan data dari Google Drive.');
    store.setSyncState('ERROR', msg);
    throw new Error(msg);
  }
}

async function maybeTriggerWifiBackup(netState: NetInfoState): Promise<void> {
  const isWifiConnected =
    netState.type === 'wifi' && netState.isConnected === true;
  if (!isWifiConnected) {
    return;
  }

  const store = useAppStore.getState();
  if (
    !store.isDbReady ||
    !store.googleUser ||
    !store.autoBackupWifi ||
    !store.hasPendingChanges ||
    store.syncStatus !== 'IDLE'
  ) {
    return;
  }

  const now = Date.now();
  if (now - lastAutoBackupAttemptMs < AUTO_BACKUP_COOLDOWN_MS) {
    return;
  }
  lastAutoBackupAttemptMs = now;

  try {
    await performManualBackup();
  } catch {
    // Auto-backup background gagal secara senyap agar tidak mengganggu operasional lapangan
  }
}

export function subscribeWifiAutoBackup(): () => void {
  const unsubscribeNet = NetInfo.addEventListener((state) => {
    void maybeTriggerWifiBackup(state);
  });

  const unsubscribeStore = useAppStore.subscribe((state, prevState) => {
    if (
      state.hasPendingChanges &&
      (state.dbRevision !== prevState.dbRevision ||
        state.autoBackupWifi !== prevState.autoBackupWifi ||
        state.googleUser !== prevState.googleUser)
    ) {
      void NetInfo.fetch().then((netState) => maybeTriggerWifiBackup(netState));
    }
  });

  return () => {
    unsubscribeNet();
    unsubscribeStore();
  };
}
