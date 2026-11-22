import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  authenticateWithBiometrics,
  getBiometricCapability,
  verifyStoredPin,
} from '../../services/appLockService';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, FONTS, SIZING, TYPOGRAPHY } from '../../theme/tokens';
import {
  MAX_PIN_ATTEMPTS,
  PIN_LENGTH,
  PIN_LOCKOUT_SECONDS,
} from '../../utils/pinLockHelpers';
import { PinKeypad } from './PinKeypad';

export function AppLockScreen() {
  const workshopName = useAppStore((s) => s.workshopName);
  const biometricEnabled = useAppStore((s) => s.biometricEnabled);
  const setIsAppLocked = useAppStore((s) => s.setIsAppLocked);

  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Sidik Jari');

  const autoPromptedRef = useRef(false);

  const handleBiometricAuth = useCallback(async () => {
    const result = await authenticateWithBiometrics('Buka kunci BukuKayu');
    if (result.success) {
      setFailedAttempts(0);
      setLockoutSecondsLeft(0);
      setErrorMsg(null);
      setPin('');
      setIsAppLocked(false);
      return;
    }

    if (
      result.error &&
      result.error !== 'user_cancel' &&
      result.error !== 'system_cancel' &&
      result.error !== 'app_cancel' &&
      result.error !== 'user_fallback'
    ) {
      setErrorMsg('Verifikasi biometrik belum berhasil. Masukkan PIN Anda.');
    }
  }, [setIsAppLocked]);

  useEffect(() => {
    let active = true;
    const initBiometric = async () => {
      if (!biometricEnabled) {
        if (active) {
          setBiometricAvailable(false);
        }
        return;
      }
      const cap = await getBiometricCapability();
      if (!active) {
        return;
      }
      const usable = cap.supported && cap.enrolled;
      setBiometricAvailable(usable);
      setBiometricLabel(cap.label);
      if (usable && !autoPromptedRef.current) {
        autoPromptedRef.current = true;
        void handleBiometricAuth();
      }
    };
    void initBiometric();
    return () => {
      active = false;
    };
  }, [biometricEnabled, handleBiometricAuth]);

  useEffect(() => {
    if (lockoutSecondsLeft <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      setLockoutSecondsLeft((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0) {
          setErrorMsg(null);
        }
        return next;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [lockoutSecondsLeft]);

  const verifyEnteredPin = async (enteredPin: string) => {
    setVerifying(true);
    try {
      const ok = await verifyStoredPin(enteredPin);
      if (ok) {
        setFailedAttempts(0);
        setLockoutSecondsLeft(0);
        setErrorMsg(null);
        setPin('');
        setIsAppLocked(false);
        return;
      }

      const nextFailed = failedAttempts + 1;
      setPin('');
      if (nextFailed >= MAX_PIN_ATTEMPTS) {
        setFailedAttempts(0);
        setLockoutSecondsLeft(PIN_LOCKOUT_SECONDS);
        setErrorMsg(
          biometricAvailable
            ? `Terlalu banyak salah PIN. Tunggu ${PIN_LOCKOUT_SECONDS} detik atau pakai ${biometricLabel}.`
            : `Terlalu banyak salah PIN. Tunggu ${PIN_LOCKOUT_SECONDS} detik sebelum mencoba lagi.`
        );
      } else {
        setFailedAttempts(nextFailed);
        setErrorMsg(
          `PIN salah (${nextFailed}/${MAX_PIN_ATTEMPTS}). Coba periksa kembali.`
        );
      }
    } finally {
      setVerifying(false);
    }
  };

  const handlePinChange = (nextPin: string) => {
    if (verifying || lockoutSecondsLeft > 0) {
      return;
    }
    setErrorMsg(null);
    setPin(nextPin);
    if (nextPin.length === PIN_LENGTH) {
      void verifyEnteredPin(nextPin);
    }
  };

  const handleForgotPin = () => {
    Alert.alert(
      'Lupa PIN BukuKayu?',
      biometricAvailable
        ? `Jika fitur ${biometricLabel} sudah aktif, tekan "Buka dengan ${biometricLabel}" untuk masuk, lalu ubah PIN lewat menu Cadangkan & Pengaturan → Kunci Aplikasi.\n\nJika tidak bisa masuk sama sekali, hapus data atau pasang ulang aplikasi lalu pulihkan catatan bengkel dari cadangan Google Drive atau file .db Anda (PIN tidak ikut tersimpan di file cadangan).`
        : 'Demi keamanan catatan bengkel, PIN hanya disimpan di perangkat ini dan tidak bisa dilewati.\n\nJika lupa PIN, hapus data atau pasang ulang aplikasi lalu pulihkan seluruh catatan bengkel dari cadangan Google Drive atau file .db Anda (PIN tidak ikut di file cadangan).'
    );
  };

  const subtitle =
    lockoutSecondsLeft > 0
      ? `Tunggu ${lockoutSecondsLeft} detik sebelum memasukkan PIN lagi.`
      : biometricAvailable
      ? `Masukkan PIN 6 angka atau gunakan ${biometricLabel.toLowerCase()}`
      : 'Masukkan PIN 6 angka untuk membuka catatan bengkel';

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.brandBlock}>
            <View style={styles.lockBadge}>
              <Feather name="lock" size={28} color={COLORS.navy} />
            </View>
            <Text style={styles.workshopName}>{workshopName}</Text>
          </View>

          <PinKeypad
            title="BukuKayu Terkunci"
            subtitle={subtitle}
            value={pin}
            onChange={handlePinChange}
            errorMessage={errorMsg}
            disabled={verifying || lockoutSecondsLeft > 0}
            showBiometricButton={biometricAvailable}
            biometricLabel={biometricLabel}
            onBiometricPress={() => void handleBiometricAuth()}
          />

          <View style={styles.footerActions}>
            {biometricAvailable ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => void handleBiometricAuth()}
                style={styles.bioPillBtn}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name="fingerprint"
                  size={20}
                  color={COLORS.navy}
                />
                <Text style={styles.bioPillText}>
                  Buka dengan {biometricLabel}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleForgotPin}
              style={styles.forgotBtn}
              accessibilityRole="button"
            >
              <Text style={styles.forgotText}>Lupa PIN?</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 9999,
    elevation: 24,
    backgroundColor: COLORS.bg,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 18,
  },
  brandBlock: {
    alignItems: 'center',
    gap: 10,
  },
  lockBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.navyLight,
    borderWidth: 1,
    borderColor: COLORS.navyBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workshopName: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  footerActions: {
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  bioPillBtn: {
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: SIZING.radiusPill,
    backgroundColor: COLORS.navyLight,
    borderWidth: 1,
    borderColor: COLORS.navyBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bioPillText: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.bold,
    color: COLORS.navy,
  },
  forgotBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotText: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
});
