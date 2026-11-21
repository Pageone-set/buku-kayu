import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { getAppSettings } from '../db/appMetaRepo';
import { initDatabase } from '../db/database';
import {
  checkCloudBackupExists,
  subscribeWifiAutoBackup,
} from '../services/driveBackup';
import {
  configureGoogleSignIn,
  trySilentGoogleSignIn,
} from '../services/googleDriveService';
import { useAppStore } from '../store/useAppStore';
import { COLORS, TYPOGRAPHY } from '../theme/tokens';

export default function RootLayout() {
  const isDbReady = useAppStore((s) => s.isDbReady);
  const dbError = useAppStore((s) => s.dbError);
  const setDbReady = useAppStore((s) => s.setDbReady);
  const setDbError = useAppStore((s) => s.setDbError);
  const setWorkshopName = useAppStore((s) => s.setWorkshopName);
  const setLastBackupAt = useAppStore((s) => s.setLastBackupAt);
  const setAutoBackupWifi = useAppStore((s) => s.setAutoBackupWifi);
  const setGoogleUser = useAppStore((s) => s.setGoogleUser);

  const bootstrap = useCallback(async () => {
    setDbError(null);
    try {
      configureGoogleSignIn();
      await initDatabase();
      const settings = await getAppSettings();
      setWorkshopName(settings.workshopName);
      setLastBackupAt(settings.lastBackupAt);
      setAutoBackupWifi(settings.autoBackupWifi);
      setDbReady(true);

      const silentUser = await trySilentGoogleSignIn();
      if (silentUser) {
        setGoogleUser(silentUser);
        void checkCloudBackupExists().catch(() => undefined);
      }
    } catch (error) {
      setDbError(
        error instanceof Error
          ? error.message
          : 'Gagal menyiapkan database lokal.'
      );
    }
  }, [
    setAutoBackupWifi,
    setDbError,
    setDbReady,
    setGoogleUser,
    setLastBackupAt,
    setWorkshopName,
  ]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!isDbReady) {
      return;
    }
    const unsubscribe = subscribeWifiAutoBackup();
    return unsubscribe;
  }, [isDbReady]);

  if (dbError) {
    return (
      <SafeAreaProvider>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Gagal Membuka Data Bengkel</Text>
          <Text style={styles.errorDesc}>{dbError}</Text>
          <PrimaryButton
            title="Coba Lagi"
            onPress={() => void bootstrap()}
            style={styles.retryBtn}
          />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!isDbReady) {
    return (
      <SafeAreaProvider>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.amber} />
          <Text style={styles.loadingTitle}>Membuka BukuKayu...</Text>
          <Text style={styles.loadingSub}>Menyiapkan catatan bengkel</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.textPrimary,
          headerTitleStyle: { fontWeight: '800', fontSize: 18 },
          headerShadowVisible: true,
          contentStyle: { backgroundColor: COLORS.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="sale/new"
          options={{ title: 'Catat Jual Kayu' }}
        />
        <Stack.Screen
          name="sale/[id]"
          options={{ title: 'Detail Nota Kayu' }}
        />
        <Stack.Screen
          name="order/new"
          options={{ title: 'Catat Order Furniture' }}
        />
        <Stack.Screen
          name="order/[id]"
          options={{ title: 'Detail Orderan' }}
        />
        <Stack.Screen
          name="settings/backup"
          options={{ title: 'Cadangkan & Pengaturan' }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 10,
  },
  loadingTitle: {
    fontSize: TYPOGRAPHY.heading,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  loadingSub: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.heading,
    fontWeight: '800',
    color: COLORS.red,
    textAlign: 'center',
  },
  errorDesc: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryBtn: {
    minWidth: 180,
  },
});
