import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { performManualBackup } from '../../services/driveBackup';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, FONTS, SHADOWS, SIZING, TYPOGRAPHY } from '../../theme/tokens';
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
        activeOpacity={0.78}
        onPress={() => router.push('/settings/backup')}
        style={styles.topRow}
      >
        <View
          style={[
            styles.iconWrap,
            googleUser ? styles.iconConnected : styles.iconDisconnected,
          ]}
        >
          <Feather
            name={googleUser ? 'cloud' : 'cloud-off'}
            size={21}
            color={googleUser ? COLORS.green : COLORS.ocean}
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {googleUser
              ? `Drive: ${googleUser.email}`
              : 'Cadangkan ke Google Drive'}
          </Text>
          <Text style={styles.subtitle}>
            Terakhir: {formatBackupRelativeTime(lastBackupAt)}
          </Text>
          {hasPendingChanges && googleUser ? (
            <Text style={styles.pendingText}>
              Ada catatan baru yang belum dicadangkan
            </Text>
          ) : null}
        </View>
        <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
      </TouchableOpacity>

      {googleUser ? (
        <PrimaryButton
          title={isBusy ? 'Sedang Mencadangkan...' : 'Cadangkan Sekarang'}
          variant="outline"
          loading={isBusy}
          onPress={handleBackupNow}
          icon={
            <Feather name="upload-cloud" size={18} color={COLORS.textPrimary} />
          }
        />
      ) : (
        <PrimaryButton
          title="Hubungkan Google Drive"
          variant="outline"
          onPress={() => router.push('/settings/backup')}
          icon={<Feather name="cloud" size={18} color={COLORS.ocean} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZING.radiusXl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    gap: 12,
    ...SHADOWS.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconConnected: {
    backgroundColor: COLORS.greenLight,
  },
  iconDisconnected: {
    backgroundColor: COLORS.oceanLight,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  pendingText: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.navy,
    marginTop: 2,
  },
});
