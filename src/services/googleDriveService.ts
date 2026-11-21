import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { Directory, File, Paths } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { setSetting } from '../db/appMetaRepo';
import {
  DB_NAME,
  checkpointWal,
  closeDatabase,
  getDatabase,
  reopenDatabase,
} from '../db/database';
import { DriveBackupFileInfo, GoogleUserProfile } from '../types/domain';
import {
  buildMultipartRelatedBody,
  isValidSqliteBytes,
} from '../utils/drivePayload';
import { getLocalTimestampIso } from '../utils/formatters';

export const BACKUP_FILE_NAME = 'bukukayu_backup.db';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';

let isConfigured = false;

export function configureGoogleSignIn(): void {
  if (isConfigured) {
    return;
  }
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  GoogleSignin.configure({
    scopes: [DRIVE_SCOPE],
    ...(webClientId ? { webClientId } : {}),
  });
  isConfigured = true;
}

function mapGoogleUser(raw: {
  id: string;
  name: string | null;
  email: string;
  photo: string | null;
}): GoogleUserProfile {
  return {
    id: raw.id,
    name: raw.name || raw.email,
    email: raw.email,
    photo: raw.photo,
  };
}

function toFileUri(pathOrUri: string): string {
  if (pathOrUri.startsWith('file://')) {
    return pathOrUri;
  }
  const normalized = pathOrUri.startsWith('/') ? pathOrUri : `/${pathOrUri}`;
  return `file://${normalized}`;
}

async function resolveLiveDatabaseFiles(): Promise<{
  dbDir: Directory;
  dbFile: File;
  walFile: File;
  shmFile: File;
}> {
  let dbPath = '';
  try {
    const db = await getDatabase();
    if (db.databasePath && db.databasePath !== ':memory:') {
      dbPath = db.databasePath;
    }
  } catch {
    // Fallback to defaultDatabaseDirectory below when DB is closed during restore
  }

  if (dbPath) {
    const dbFile = new File(toFileUri(dbPath));
    const dbDir = dbFile.parentDirectory;
    return {
      dbDir,
      dbFile,
      walFile: new File(`${dbFile.uri}-wal`),
      shmFile: new File(`${dbFile.uri}-shm`),
    };
  }

  const defaultDir = SQLite.defaultDatabaseDirectory;
  const dbDir =
    typeof defaultDir === 'string' && defaultDir.length > 0
      ? new Directory(toFileUri(defaultDir))
      : new Directory(Paths.document, 'SQLite');

  const dbFile = new File(dbDir, DB_NAME);
  return {
    dbDir,
    dbFile,
    walFile: new File(dbDir, `${DB_NAME}-wal`),
    shmFile: new File(dbDir, `${DB_NAME}-shm`),
  };
}

export async function signInGoogle(): Promise<GoogleUserProfile> {
  configureGoogleSignIn();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      throw new Error('Login Google dibatalkan.');
    }

    const grantedScopes = response.data.scopes ?? [];
    if (!grantedScopes.includes(DRIVE_SCOPE)) {
      const addRes = await GoogleSignin.addScopes({ scopes: [DRIVE_SCOPE] });
      if (addRes && isSuccessResponse(addRes)) {
        return mapGoogleUser(addRes.data.user);
      }
    }

    return mapGoogleUser(response.data.user);
  } catch (error) {
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          throw new Error('Login Google dibatalkan.');
        case statusCodes.IN_PROGRESS:
          throw new Error('Proses login Google sedang berjalan.');
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error(
            'Google Play Services tidak tersedia atau perlu diperbarui di HP ini.'
          );
        default:
          throw new Error(
            `Gagal login Google (${error.code}): ${error.message}`
          );
      }
    }
    throw error;
  }
}

export async function trySilentGoogleSignIn(): Promise<GoogleUserProfile | null> {
  configureGoogleSignIn();
  try {
    if (!GoogleSignin.hasPreviousSignIn()) {
      return null;
    }
    const current = GoogleSignin.getCurrentUser();
    if (current?.user) {
      return mapGoogleUser(current.user);
    }
    const response = await GoogleSignin.signInSilently();
    if (response.type === 'success') {
      return mapGoogleUser(response.data.user);
    }
    return null;
  } catch {
    return null;
  }
}

export async function signOutGoogle(): Promise<void> {
  configureGoogleSignIn();
  await GoogleSignin.signOut();
}

async function getAccessToken(): Promise<string> {
  const tokens = await GoogleSignin.getTokens();
  if (!tokens.accessToken) {
    throw new Error('Token Google tidak ditemukan. Silakan masuk ulang.');
  }
  return tokens.accessToken;
}

async function driveFetch(
  url: string,
  init: RequestInit = {},
  allowRetryOn401 = true
): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (response.status === 401 && allowRetryOn401) {
    await GoogleSignin.clearCachedAccessToken(token);
    const refreshed = await getAccessToken();
    const retryHeaders = new Headers(init.headers);
    retryHeaders.set('Authorization', `Bearer ${refreshed}`);
    return fetch(url, {
      ...init,
      headers: retryHeaders,
    });
  }

  return response;
}

export async function findBackupFile(): Promise<DriveBackupFileInfo | null> {
  const q = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false`);
  const url = `${DRIVE_FILES_API}?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc`;
  const res = await driveFetch(url, { method: 'GET' });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal memeriksa cadangan di Google Drive (${res.status}): ${errText}`);
  }

  const json = (await res.json()) as {
    files?: { id: string; name: string; modifiedTime: string; size?: string }[];
  };
  const first = json.files?.[0];
  if (!first) {
    return null;
  }

  return {
    id: first.id,
    name: first.name,
    modifiedTime: first.modifiedTime,
    size: Number.parseInt(first.size ?? '0', 10) || 0,
  };
}

export async function createDatabaseSnapshotFile(
  fileName = `bukukayu_snapshot_${Date.now()}.db`
): Promise<File> {
  const { dbFile } = await resolveLiveDatabaseFiles();

  // Pastikan seluruh transaksi di WAL masuk ke file .db utama sebelum dibaca
  await checkpointWal();

  if (!dbFile.exists) {
    throw new Error('File database lokal tidak ditemukan.');
  }

  const snapshotFile = new File(Paths.cache, fileName);
  await dbFile.copy(snapshotFile, { overwrite: true });
  return snapshotFile;
}

export async function replaceDatabaseWithFile(sourceFile: File): Promise<void> {
  const bytes = await sourceFile.bytes();
  if (!isValidSqliteBytes(bytes)) {
    throw new Error(
      'File cadangan tidak valid atau rusak (bukan database SQLite BukuKayu).'
    );
  }

  const { dbDir, dbFile, walFile, shmFile } = await resolveLiveDatabaseFiles();
  const rollbackFile = new File(
    Paths.cache,
    `bukukayu_rollback_${Date.now()}.db`
  );

  try {
    if (dbFile.exists) {
      await checkpointWal().catch(() => undefined);
      await dbFile.copy(rollbackFile, { overwrite: true });
    }

    await closeDatabase();

    try {
      if (!dbDir.exists) {
        dbDir.create({ intermediates: true, idempotent: true });
      }
      if (walFile.exists) {
        walFile.delete();
      }
      if (shmFile.exists) {
        shmFile.delete();
      }
      await sourceFile.copy(dbFile, { overwrite: true });

      const reopened = await reopenDatabase();
      await reopened.getFirstAsync<{ cnt: number }>(
        'SELECT COUNT(*) AS cnt FROM wood_stocks'
      );
    } catch (restoreErr) {
      if (rollbackFile.exists) {
        if (walFile.exists) {
          try {
            walFile.delete();
          } catch {
            // ignore
          }
        }
        if (shmFile.exists) {
          try {
            shmFile.delete();
          } catch {
            // ignore
          }
        }
        await rollbackFile.copy(dbFile, { overwrite: true }).catch(() => undefined);
      }
      await reopenDatabase().catch(() => undefined);
      throw restoreErr;
    }
  } finally {
    if (rollbackFile.exists) {
      try {
        rollbackFile.delete();
      } catch {
        // ignore
      }
    }
  }
}

export async function backupDatabaseToDrive(): Promise<{
  fileId: string;
  backupTimeIso: string;
  sizeBytes: number;
}> {
  const snapshotFile = await createDatabaseSnapshotFile();

  try {
    const base64Data = await snapshotFile.base64();
    const sizeBytes = snapshotFile.size || 0;

    const existing = await findBackupFile();
    const boundary = `bukukayu_boundary_${Date.now()}`;
    const metadata = existing
      ? { name: BACKUP_FILE_NAME }
      : { name: BACKUP_FILE_NAME, parents: ['appDataFolder'] };

    const body = buildMultipartRelatedBody(boundary, metadata, base64Data);
    const uploadUrl = existing
      ? `${DRIVE_UPLOAD_API}/${existing.id}?uploadType=multipart&fields=id,name,modifiedTime,size`
      : `${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,name,modifiedTime,size`;

    const res = await driveFetch(uploadUrl, {
      method: existing ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `Gagal mengunggah cadangan ke Google Drive (${res.status}): ${errText}`
      );
    }

    const uploaded = (await res.json()) as { id: string; size?: string };
    const backupTimeIso = getLocalTimestampIso();
    await setSetting('last_backup_at', backupTimeIso);

    return {
      fileId: uploaded.id,
      backupTimeIso,
      sizeBytes: Number.parseInt(uploaded.size ?? String(sizeBytes), 10) || sizeBytes,
    };
  } finally {
    if (snapshotFile.exists) {
      try {
        snapshotFile.delete();
      } catch {
        // Abaikan kegagalan hapus file sementara cache
      }
    }
  }
}

export async function restoreDatabaseFromDrive(
  explicitFileId?: string
): Promise<{ restoredFromTime: string }> {
  const backupInfo = explicitFileId
    ? { id: explicitFileId, modifiedTime: getLocalTimestampIso() }
    : await findBackupFile();

  if (!backupInfo) {
    throw new Error('File cadangan BukuKayu belum ditemukan di Google Drive akun ini.');
  }

  const downloadedFile = new File(
    Paths.cache,
    `bukukayu_restore_${Date.now()}.db`
  );

  try {
    const token = await getAccessToken();
    const downloadUrl = `${DRIVE_FILES_API}/${backupInfo.id}?alt=media`;

    let resultFile: File;
    try {
      resultFile = await File.downloadFileAsync(downloadUrl, downloadedFile, {
        headers: { Authorization: `Bearer ${token}` },
        idempotent: true,
      });
    } catch {
      // Coba ulang sekali bila token kadaluarsa
      await GoogleSignin.clearCachedAccessToken(token);
      const freshToken = await getAccessToken();
      resultFile = await File.downloadFileAsync(downloadUrl, downloadedFile, {
        headers: { Authorization: `Bearer ${freshToken}` },
        idempotent: true,
      });
    }

    await replaceDatabaseWithFile(resultFile);

    return { restoredFromTime: backupInfo.modifiedTime };
  } finally {
    if (downloadedFile.exists) {
      try {
        downloadedFile.delete();
      } catch {
        // ignore
      }
    }
  }
}
