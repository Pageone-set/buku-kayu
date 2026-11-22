import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppLockScreen } from '../components/ui/AppLockScreen';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { getAppSettings } from '../db/appMetaRepo';
import { initDatabase } from '../db/database';
import { loadAppLockConfig } from '../services/appLockService';
import {
  checkCloudBackupExists,
  subscribeWifiAutoBackup,
} from '../services/driveBackup';
import {
  configureGoogleSignIn,
  trySilentGoogleSignIn,
} from '../services/googleDriveService';
import { useAppStore } from '../store/useAppStore';
import { COLORS, FONTS, TYPOGRAPHY } from '../theme/tokens';
import { shouldAutoLock } from '../utils/pinLockHelpers';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const isDbReady = useAppStore((s) => s.isDbReady);
  const dbError = useAppStore((s) => s.dbError);
  const isAppLocked = useAppStore((s) => s.isAppLocked);
  const setDbReady = useAppStore((s) => s.setDbReady);
  const setDbError = useAppStore((s) => s.setDbError);
  const setWorkshopName = useAppStore((s) => s.setWorkshopName);
  const setLastBackupAt = useAppStore((s) => s.setLastBackupAt);
  const setAutoBackupWifi = useAppStore((s) => s.setAutoBackupWifi);
  const setGoogleUser = useAppStore((s) => s.setGoogleUser);
  const setAppLockConfig = useAppStore((s) => s.setAppLockConfig);
  const setIsAppLocked = useAppStore((s) => s.setIsAppLocked);

  const prevAppStateRef = useRef<string | null | undefined>(
    AppState.currentState
  );
  const backgroundedAtRef = useRef<number | null>(null);

  const bootstrap = useCallback(async () => {
    setDbError(null);
    try {
      configureGoogleSignIn();
      await initDatabase();
      const [settings, lockConfig] = await Promise.all([
        getAppSettings(),
        loadAppLockConfig(),
      ]);
      setWorkshopName(settings.workshopName);
      setLastBackupAt(settings.lastBackupAt);
      setAutoBackupWifi(settings.autoBackupWifi);
      setAppLockConfig(lockConfig);
      setIsAppLocked(lockConfig.enabled);
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
    setAppLockConfig,
    setAutoBackupWifi,
    setDbError,
    setDbReady,
    setGoogleUser,
    setIsAppLocked,
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

  useEffect(() => {
    if (!isDbReady) {
      return;
    }
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        const prevState = prevAppStateRef.current;
        prevAppStateRef.current = nextState;

        const state = useAppStore.getState();
        if (nextState === 'background') {
          if (state.appLockEnabled && !state.isBiometricPromptActive) {
            backgroundedAtRef.current = Date.now();
          }
          return;
        }

        if (prevState === 'background' && nextState === 'active') {
          const bgTime = backgroundedAtRef.current;
          backgroundedAtRef.current = null;
          if (
            state.appLockEnabled &&
            !state.isBiometricPromptActive &&
            !state.isAppLocked &&
            shouldAutoLock(bgTime, Date.now(), state.autoLockDelaySec)
          ) {
            state.setIsAppLocked(true);
          }
        }
      }
    );
    return () => subscription.remove();
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

  if (!isDbReady || (!fontsLoaded && !fontError)) {
    return (
      <SafeAreaProvider>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.navy} />
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
          headerStyle: { backgroundColor: COLORS.bg },
          headerTintColor: COLORS.textPrimary,
          headerTitleStyle: { fontFamily: FONTS.extraBold, fontSize: 18 },
          headerShadowVisible: false,
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
        <Stack.Screen
          name="settings/wood-presets"
          options={{ title: 'Jenis Kayu & Ukuran' }}
        />
        <Stack.Screen
          name="settings/suppliers"
          options={{ title: 'Asal & Pemasok Kayu' }}
        />
        <Stack.Screen
          name="settings/security"
          options={{ title: 'Kunci Aplikasi' }}
        />
      </Stack>
      {isAppLocked ? <AppLockScreen /> : null}
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
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  loadingSub: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.heading,
    fontFamily: FONTS.extraBold,
    color: COLORS.red,
    textAlign: 'center',
  },
  errorDesc: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryBtn: {
    minWidth: 180,
  },
});
