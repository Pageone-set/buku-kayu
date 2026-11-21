import { create } from 'zustand';
import {
  BackupSyncStatus,
  DriveBackupFileInfo,
  GoogleUserProfile,
} from '../types/domain';

interface AppState {
  isDbReady: boolean;
  dbError: string | null;
  dbRevision: number;
  workshopName: string;
  googleUser: GoogleUserProfile | null;
  syncStatus: BackupSyncStatus;
  syncMessage: string | null;
  lastBackupAt: string | null;
  cloudBackupInfo: DriveBackupFileInfo | null;
  autoBackupWifi: boolean;
  hasPendingChanges: boolean;

  setDbReady: (ready: boolean) => void;
  setDbError: (error: string | null) => void;
  bumpDbRevision: (markPending?: boolean) => void;
  setWorkshopName: (name: string) => void;
  setGoogleUser: (user: GoogleUserProfile | null) => void;
  setSyncState: (status: BackupSyncStatus, message?: string | null) => void;
  setLastBackupAt: (iso: string | null) => void;
  setCloudBackupInfo: (info: DriveBackupFileInfo | null) => void;
  setAutoBackupWifi: (enabled: boolean) => void;
  markSynced: (backupTimeIso: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isDbReady: false,
  dbError: null,
  dbRevision: 0,
  workshopName: 'Bengkel Kayu',
  googleUser: null,
  syncStatus: 'IDLE',
  syncMessage: null,
  lastBackupAt: null,
  cloudBackupInfo: null,
  autoBackupWifi: true,
  hasPendingChanges: false,

  setDbReady: (ready) => set({ isDbReady: ready }),
  setDbError: (error) => set({ dbError: error }),
  bumpDbRevision: (markPending = true) =>
    set((state) => ({
      dbRevision: state.dbRevision + 1,
      hasPendingChanges: markPending ? true : state.hasPendingChanges,
    })),
  setWorkshopName: (name) => set({ workshopName: name }),
  setGoogleUser: (user) => set({ googleUser: user }),
  setSyncState: (status, message = null) =>
    set({ syncStatus: status, syncMessage: message }),
  setLastBackupAt: (iso) => set({ lastBackupAt: iso }),
  setCloudBackupInfo: (info) => set({ cloudBackupInfo: info }),
  setAutoBackupWifi: (enabled) => set({ autoBackupWifi: enabled }),
  markSynced: (backupTimeIso) =>
    set({
      syncStatus: 'IDLE',
      syncMessage: 'Data berhasil dicadangkan ke Google Drive.',
      lastBackupAt: backupTimeIso,
      hasPendingChanges: false,
    }),
}));
