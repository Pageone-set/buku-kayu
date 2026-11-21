import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { performManualBackup } from '../../services/driveBackup';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, SHADOWS, SIZING, TYPOGRAPHY } from '../../theme/tokens';
import { formatBackupRelativeTime } from '../../utils/formatters';
import { PrimaryButton } from '../ui/PrimaryButton';

export function BackupStatusBanner() {
  const googleUser = useAppStore((s) => s.googleUser);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const lastBackupAt = useAppStore((s) => s.lastBackupAt);
  const hasPendingChanges = useAppStore((s) => s.hasPendingChanges);

  const isBusy = syncStatus === 'BACKING_UP' || syncStatus === 'RESTORING';

  const handleBackupNow = async () => {
    try {
      await performManualBackup();
      Alert.alert(
        'Cadangan Berhasil',
        'Data catatan bengkel sudah aman tersimpan di Google Drive pribadi Anda.'
      );
    } catch (error) {
      Alert.alert(
        'Gagal Mencadangkan',
        error instanceof Error ? error.message : 'Periksa koneksi internet Anda.'
      );
    }
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => router.push('/settings/backup')}
        style={styles.topRow}
      >
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name={googleUser ? 'cloud-check-outline' : 'cloud-off-outline'}
            size={24}
            color={googleUser ? COLORS.green : COLORS.amberDark}
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>
            {googleUser
              ? `Google Drive: ${googleUser.email}`
              : 'Cadangkan Data ke Google Drive'}
          </Text>
          <Text style={styles.subtitle}>
            Terakhir dicadangkan: {formatBackupRelativeTime(lastBackupAt)}
          </Text>
          {hasPendingChanges && googleUser ? (
            <Text style={styles.pendingText}>
              Ada catatan baru yang belum dicadangkan
            </Text>
          ) : null}
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={COLORS.textMuted}
        />
      </TouchableOpacity>

      {googleUser ? (
        <PrimaryButton
          title={isBusy ? 'Sedang Mencadangkan...' : 'Cadangkan Sekarang'}
          variant="outline"
          loading={isBusy}
          onPress={handleBackupNow}
          icon={
            <MaterialCommunityIcons
              name="cloud-upload-outline"
              size={20}
              color={COLORS.textPrimary}
            />
          }
        />
      ) : (
        <PrimaryButton
          title="Hubungkan Google Drive"
          variant="outline"
          onPress={() => router.push('/settings/backup')}
          icon={
            <MaterialCommunityIcons
              name="google"
              size={20}
              color={COLORS.textPrimary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZING.radiusLg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZING.spacingMd,
    gap: 12,
    ...SHADOWS.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.label,
    color: COLORS.textSecondary,
  },
  pendingText: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.amberDark,
    marginTop: 2,
  },
});
