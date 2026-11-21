import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SectionCard } from '../../components/ui/SectionCard';
import { setSetting } from '../../db/appMetaRepo';
import {
  checkCloudBackupExists,
  connectGoogleAccount,
  disconnectGoogleAccount,
  performManualBackup,
  performRestoreFromDrive,
} from '../../services/driveBackup';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, SIZING, TYPOGRAPHY } from '../../theme/tokens';
import {
  formatBackupRelativeTime,
  formatBytesSize,
  formatDateTimeIndo,
} from '../../utils/formatters';

export default function BackupSettingsScreen() {
  const workshopName = useAppStore((s) => s.workshopName);
  const setWorkshopName = useAppStore((s) => s.setWorkshopName);
  const googleUser = useAppStore((s) => s.googleUser);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const syncMessage = useAppStore((s) => s.syncMessage);
  const lastBackupAt = useAppStore((s) => s.lastBackupAt);
  const cloudBackupInfo = useAppStore((s) => s.cloudBackupInfo);
  const autoBackupWifi = useAppStore((s) => s.autoBackupWifi);
  const setAutoBackupWifi = useAppStore((s) => s.setAutoBackupWifi);

  const [nameInput, setNameInput] = useState(workshopName);
  const [savingName, setSavingName] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [newPhoneOfferOpen, setNewPhoneOfferOpen] = useState(false);

  const isBusy = syncStatus === 'BACKING_UP' || syncStatus === 'RESTORING';

  const handleSaveWorkshopName = async () => {
    const clean = nameInput.trim();
    if (!clean) {
      Alert.alert('Nama Bengkel Kosong', 'Masukkan nama bengkel Anda.');
      return;
    }
    setSavingName(true);
    try {
      await setSetting('workshop_name', clean);
      setWorkshopName(clean);
      Alert.alert('Tersimpan', 'Nama bengkel akan tampil di nota WhatsApp & PDF.');
    } catch {
      Alert.alert('Gagal', 'Tidak bisa menyimpan nama bengkel.');
    } finally {
      setSavingName(false);
    }
  };

  const handleSignIn = async () => {
    setConnecting(true);
    try {
      const { existingBackup } = await connectGoogleAccount();
      if (existingBackup) {
        setNewPhoneOfferOpen(true);
      }
    } catch (error) {
      Alert.alert(
        'Gagal Masuk Google',
        error instanceof Error
          ? error.message
          : 'Pastikan APK Development Build & OAuth Google Cloud sudah terpasang.'
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await disconnectGoogleAccount();
    } catch (error) {
      Alert.alert(
        'Gagal Keluar',
        error instanceof Error ? error.message : 'Coba lagi.'
      );
    }
  };

  const handleCheckCloud = async () => {
    try {
      const info = await checkCloudBackupExists();
      if (!info) {
        Alert.alert(
          'Belum Ada Cadangan',
          'Belum ada file cadangan BukuKayu di Google Drive akun ini.'
        );
      }
    } catch (error) {
      Alert.alert(
        'Gagal Memeriksa',
        error instanceof Error ? error.message : 'Periksa koneksi internet.'
      );
    }
  };

  const handleBackupNow = async () => {
    try {
      await performManualBackup();
      Alert.alert(
        'Cadangan Berhasil',
        'Seluruh catatan penjualan, orderan, stok, dan buku kas sudah tersimpan aman di Google Drive.'
      );
    } catch (error) {
      Alert.alert(
        'Gagal Mencadangkan',
        error instanceof Error ? error.message : 'Periksa koneksi internet.'
      );
    }
  };

  const handleConfirmRestore = async () => {
    try {
      await performRestoreFromDrive(cloudBackupInfo?.id);
      setRestoreConfirmOpen(false);
      setNewPhoneOfferOpen(false);
      setNameInput(useAppStore.getState().workshopName);
      Alert.alert(
        'Data Berhasil Dipulihkan',
        'Seluruh data bengkel dari Google Drive sudah dipulihkan ke HP ini.'
      );
    } catch (error) {
      setRestoreConfirmOpen(false);
      setNewPhoneOfferOpen(false);
      Alert.alert(
        'Gagal Memulihkan Data',
        error instanceof Error ? error.message : 'Pastikan file cadangan valid.'
      );
    }
  };

  const handleToggleWifiAutoBackup = async (nextVal: boolean) => {
    setAutoBackupWifi(nextVal);
    try {
      await setSetting('auto_backup_wifi', nextVal ? '1' : '0');
    } catch {
      // ignore
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <SectionCard title="Profil Bengkel (Untuk Nota)">
          <Text style={styles.fieldLabel}>Nama Bengkel / Usaha Kayu</Text>
          <TextInput
            style={styles.textInput}
            value={nameInput}
            onChangeText={setNameInput}
            placeholder="Contoh: UD Kayu Jati Berkah"
            placeholderTextColor={COLORS.textMuted}
          />
          <PrimaryButton
            title="Simpan Nama Bengkel"
            variant="outline"
            loading={savingName}
            onPress={() => void handleSaveWorkshopName()}
          />
        </SectionCard>

        <SectionCard title="Akun Google Drive Pribadi">
          {googleUser ? (
            <View style={{ gap: 10 }}>
              <View style={styles.userBox}>
                <MaterialCommunityIcons
                  name="account-check"
                  size={28}
                  color={COLORS.green}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{googleUser.name}</Text>
                  <Text style={styles.userEmail}>{googleUser.email}</Text>
                </View>
              </View>
              <PrimaryButton
                title="Ganti / Keluar Akun Google"
                variant="outline"
                disabled={isBusy}
                onPress={() => void handleSignOut()}
              />
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={styles.bodyText}>
                Masuk dengan akun Google pribadi untuk menyimpan cadangan data di
                folder tersembunyi Google Drive (aman dan tidak mengotori folder
                Drive utama Anda).
              </Text>
              <PrimaryButton
                title="Masuk dengan Google"
                variant="primary"
                size="lg"
                loading={connecting}
                onPress={() => void handleSignIn()}
                icon={
                  <MaterialCommunityIcons
                    name="google"
                    size={22}
                    color={COLORS.textOnDark}
                  />
                }
              />
            </View>
          )}
        </SectionCard>

        <SectionCard title="Cadangkan & Pulihkan Data">
          <View style={styles.statusBox}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Cadangan dari HP ini</Text>
              <Text style={styles.statusVal}>
                {formatBackupRelativeTime(lastBackupAt)}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Cadangan di Google Drive</Text>
              <Text style={styles.statusVal}>
                {cloudBackupInfo
                  ? `${formatDateTimeIndo(cloudBackupInfo.modifiedTime)} (${formatBytesSize(
                      cloudBackupInfo.size
                    )})`
                  : googleUser
                  ? 'Belum ditemukan'
                  : 'Belum masuk akun'}
              </Text>
            </View>
            {syncMessage ? (
              <Text
                style={[
                  styles.syncMsg,
                  syncStatus === 'ERROR' && { color: COLORS.red },
                ]}
              >
                {syncMessage}
              </Text>
            ) : null}
          </View>

          <PrimaryButton
            title={
              syncStatus === 'BACKING_UP'
                ? 'Sedang Mengunggah Cadangan...'
                : 'Cadangkan Sekarang ke Google Drive'
            }
            variant="success"
            size="lg"
            disabled={!googleUser || isBusy}
            loading={syncStatus === 'BACKING_UP'}
            onPress={() => void handleBackupNow()}
            icon={
              <MaterialCommunityIcons
                name="cloud-upload-outline"
                size={24}
                color={COLORS.textOnDark}
              />
            }
          />

          <PrimaryButton
            title={
              syncStatus === 'RESTORING'
                ? 'Sedang Memulihkan Data...'
                : 'Pulihkan Data dari Google Drive'
            }
            variant="danger"
            size="lg"
            disabled={!googleUser || isBusy}
            loading={syncStatus === 'RESTORING'}
            onPress={() => setRestoreConfirmOpen(true)}
            icon={
              <MaterialCommunityIcons
                name="cloud-download-outline"
                size={24}
                color={COLORS.textOnDark}
              />
            }
          />

          {googleUser ? (
            <PrimaryButton
              title="Periksa Ulang Cadangan di Drive"
              variant="ghost"
              disabled={isBusy}
              onPress={() => void handleCheckCloud()}
            />
          ) : null}

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>
                Cadangkan Otomatis saat Wi-Fi
              </Text>
              <Text style={styles.hintText}>
                Jika ada catatan baru, otomatis cadangkan saat HP terhubung Wi-Fi.
              </Text>
            </View>
            <Switch
              value={autoBackupWifi}
              onValueChange={(v) => void handleToggleWifiAutoBackup(v)}
              trackColor={{ false: COLORS.border, true: COLORS.amberBorder }}
              thumbColor={autoBackupWifi ? COLORS.amber : '#F4F4F5'}
            />
          </View>
        </SectionCard>

        <View style={styles.infoNote}>
          <MaterialCommunityIcons
            name="information-outline"
            size={20}
            color={COLORS.amberDark}
          />
          <Text style={styles.infoNoteText}>
            Login Google Drive berjalan di aplikasi Android Development Build /
            APK yang sudah didaftarkan Package Name (com.bukukayu.app) dan
            SHA-1 di Google Cloud Console.
          </Text>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={restoreConfirmOpen}
        title="Pulihkan Data dari Google Drive?"
        message="Seluruh catatan di HP ini akan diganti dengan data cadangan terakhir dari Google Drive. Pastikan Anda benar-benar ingin menimpa data saat ini."
        confirmLabel="Ya, Pulihkan"
        danger
        loading={syncStatus === 'RESTORING'}
        onConfirm={() => void handleConfirmRestore()}
        onCancel={() => setRestoreConfirmOpen(false)}
      />

      <ConfirmModal
        visible={newPhoneOfferOpen}
        title="Ditemukan Cadangan di Google Drive"
        message={
          cloudBackupInfo
            ? `Ada file cadangan terakhir (${formatDateTimeIndo(
                cloudBackupInfo.modifiedTime
              )}). Ingin pulihkan data tersebut ke HP ini sekarang?`
            : 'Ada file cadangan di akun Google Anda. Pulihkan sekarang?'
        }
        confirmLabel="Pulihkan Sekarang"
        cancelLabel="Nanti Saja"
        loading={syncStatus === 'RESTORING'}
        onConfirm={() => void handleConfirmRestore()}
        onCancel={() => setNewPhoneOfferOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    padding: SIZING.spacingMd,
    gap: 14,
    paddingBottom: 32,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.label,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  textInput: {
    minHeight: SIZING.inputMinHeight,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    borderRadius: SIZING.radiusMd,
    paddingHorizontal: 14,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  userBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.greenLight,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    borderRadius: SIZING.radiusMd,
    padding: 12,
  },
  userName: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: TYPOGRAPHY.label,
    color: COLORS.green,
    fontWeight: '600',
  },
  bodyText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  statusBox: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SIZING.radiusMd,
    padding: 12,
    gap: 8,
  },
  statusRow: {
    gap: 2,
  },
  statusLabel: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  statusVal: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  syncMsg: {
    fontSize: TYPOGRAPHY.label,
    fontWeight: '700',
    color: COLORS.green,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surfaceSubtle,
    padding: 12,
    borderRadius: SIZING.radiusMd,
  },
  switchLabel: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  hintText: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.amberLight,
    borderRadius: SIZING.radiusMd,
    padding: 12,
  },
  infoNoteText: {
    flex: 1,
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.amberDark,
    lineHeight: 19,
    fontWeight: '600',
  },
});
