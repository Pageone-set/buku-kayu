import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipSelector } from '../../components/ui/ChipSelector';
import { PinKeypad } from '../../components/ui/PinKeypad';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SectionCard } from '../../components/ui/SectionCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  authenticateWithBiometrics,
  BiometricCapability,
  changeStoredPin,
  disableAppLock,
  getBiometricCapability,
  saveAppLockConfig,
  setupPinAndEnableLock,
  verifyStoredPin,
} from '../../services/appLockService';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, FONTS, SIZING, TYPOGRAPHY } from '../../theme/tokens';
import {
  AUTO_LOCK_OPTIONS,
  formatAutoLockLabel,
  PIN_LENGTH,
} from '../../utils/pinLockHelpers';

type PinModalMode =
  | 'CREATE_FIRST'
  | 'CREATE_CONFIRM'
  | 'VERIFY_DISABLE'
  | 'VERIFY_CHANGE'
  | 'CHANGE_NEW'
  | 'CHANGE_CONFIRM';

export default function SecuritySettingsScreen() {
  const appLockEnabled = useAppStore((s) => s.appLockEnabled);
  const biometricEnabled = useAppStore((s) => s.biometricEnabled);
  const autoLockDelaySec = useAppStore((s) => s.autoLockDelaySec);
  const setAppLockConfig = useAppStore((s) => s.setAppLockConfig);
  const setIsAppLocked = useAppStore((s) => s.setIsAppLocked);

  const [biometricCap, setBiometricCap] = useState<BiometricCapability>({
    supported: false,
    enrolled: false,
    label: 'Sidik Jari / Biometrik',
  });
  const [modalMode, setModalMode] = useState<PinModalMode | null>(null);
  const [modalPin, setModalPin] = useState('');
  const [draftPin, setDraftPin] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadCap = async () => {
      const cap = await getBiometricCapability();
      if (active) {
        setBiometricCap(cap);
      }
    };
    void loadCap();
    return () => {
      active = false;
    };
  }, []);

  const closeModal = () => {
    setModalMode(null);
    setModalPin('');
    setDraftPin('');
    setModalError(null);
  };

  const openPinModal = (mode: PinModalMode) => {
    setModalMode(mode);
    setModalPin('');
    setDraftPin('');
    setModalError(null);
  };

  const handleToggleAppLock = (nextVal: boolean) => {
    if (nextVal) {
      openPinModal('CREATE_FIRST');
    } else {
      openPinModal('VERIFY_DISABLE');
    }
  };

  const handleDisableConfirmed = async () => {
    setSaving(true);
    try {
      const saved = await disableAppLock();
      setAppLockConfig(saved);
      setIsAppLocked(false);
      closeModal();
      Alert.alert(
        'Kunci Aplikasi Dimatikan',
        'BukuKayu tidak lagi meminta PIN saat dibuka.'
      );
    } catch {
      Alert.alert('Gagal', 'Tidak bisa mematikan kunci aplikasi.');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyDisableBiometric = async () => {
    const result = await authenticateWithBiometrics(
      `Verifikasi ${biometricCap.label.toLowerCase()} untuk mematikan kunci`
    );
    if (result.success) {
      await handleDisableConfirmed();
      return;
    }
    if (
      result.error &&
      result.error !== 'user_cancel' &&
      result.error !== 'system_cancel' &&
      result.error !== 'app_cancel' &&
      result.error !== 'user_fallback'
    ) {
      setModalError('Biometrik tidak cocok. Masukkan PIN 6 angka.');
    }
  };

  const processCompletedPin = async (mode: PinModalMode, enteredPin: string) => {
    if (mode === 'CREATE_FIRST') {
      setDraftPin(enteredPin);
      setModalPin('');
      setModalError(null);
      setModalMode('CREATE_CONFIRM');
      return;
    }

    if (mode === 'CREATE_CONFIRM') {
      if (enteredPin !== draftPin) {
        setModalPin('');
        setModalError('PIN tidak cocok. Ulangi konfirmasi PIN.');
        return;
      }
      setSaving(true);
      try {
        const saved = await setupPinAndEnableLock(enteredPin, false);
        setAppLockConfig(saved);
        closeModal();
        Alert.alert(
          'Kunci Aplikasi Aktif',
          biometricCap.supported && biometricCap.enrolled
            ? `PIN 6 angka aktif. Anda juga bisa menyalakan ${biometricCap.label} di bawah.`
            : 'PIN 6 angka aktif untuk melindungi BukuKayu.'
        );
      } catch {
        setModalPin('');
        setModalError('Gagal menyimpan PIN di perangkat.');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (mode === 'VERIFY_DISABLE') {
      setSaving(true);
      try {
        const ok = await verifyStoredPin(enteredPin);
        if (!ok) {
          setModalPin('');
          setModalError('PIN salah. Coba lagi.');
          return;
        }
      } finally {
        setSaving(false);
      }
      await handleDisableConfirmed();
      return;
    }

    if (mode === 'VERIFY_CHANGE') {
      setSaving(true);
      try {
        const ok = await verifyStoredPin(enteredPin);
        if (!ok) {
          setModalPin('');
          setModalError('PIN saat ini salah. Coba lagi.');
          return;
        }
        setModalPin('');
        setModalError(null);
        setModalMode('CHANGE_NEW');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (mode === 'CHANGE_NEW') {
      setDraftPin(enteredPin);
      setModalPin('');
      setModalError(null);
      setModalMode('CHANGE_CONFIRM');
      return;
    }

    if (mode === 'CHANGE_CONFIRM') {
      if (enteredPin !== draftPin) {
        setModalPin('');
        setModalError('PIN baru tidak cocok. Ulangi konfirmasi.');
        return;
      }
      setSaving(true);
      try {
        await changeStoredPin(enteredPin);
        closeModal();
        Alert.alert('PIN Diperbarui', 'PIN baru berhasil disimpan.');
      } catch {
        setModalPin('');
        setModalError('Gagal menyimpan PIN baru.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleModalPinChange = (nextPin: string) => {
    if (saving || !modalMode) {
      return;
    }
    setModalError(null);
    setModalPin(nextPin);
    if (nextPin.length === PIN_LENGTH) {
      void processCompletedPin(modalMode, nextPin);
    }
  };

  const handleToggleBiometric = async (nextVal: boolean) => {
    if (!appLockEnabled || saving) {
      return;
    }

    if (!nextVal) {
      setSaving(true);
      try {
        const saved = await saveAppLockConfig({
          enabled: true,
          biometricEnabled: false,
          autoLockDelaySec,
        });
        setAppLockConfig(saved);
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!biometricCap.supported || !biometricCap.enrolled) {
      Alert.alert(
        'Biometrik Belum Siap',
        'Daftarkan sidik jari atau kunci biometrik di Pengaturan HP Anda terlebih dahulu.'
      );
      return;
    }

    setSaving(true);
    try {
      const auth = await authenticateWithBiometrics(
        `Verifikasi ${biometricCap.label.toLowerCase()} untuk mengaktifkan`
      );
      if (!auth.success) {
        if (
          auth.error &&
          auth.error !== 'user_cancel' &&
          auth.error !== 'system_cancel' &&
          auth.error !== 'app_cancel' &&
          auth.error !== 'user_fallback'
        ) {
          Alert.alert(
            'Gagal Verifikasi',
            'Verifikasi biometrik belum berhasil. Pastikan jari atau wajah terdaftar di HP.'
          );
        }
        return;
      }

      const saved = await saveAppLockConfig({
        enabled: true,
        biometricEnabled: true,
        autoLockDelaySec,
      });
      setAppLockConfig(saved);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAutoLock = async (delaySec: number) => {
    if (!appLockEnabled) {
      return;
    }
    const saved = await saveAppLockConfig({
      enabled: true,
      biometricEnabled,
      autoLockDelaySec: delaySec,
    });
    setAppLockConfig(saved);
  };

  const modalTitle =
    modalMode === 'CREATE_FIRST'
      ? 'Buat PIN 6 Angka'
      : modalMode === 'CREATE_CONFIRM'
      ? 'Ulangi PIN 6 Angka'
      : modalMode === 'VERIFY_DISABLE'
      ? 'Masukkan PIN Saat Ini'
      : modalMode === 'VERIFY_CHANGE'
      ? 'Masukkan PIN Lama'
      : modalMode === 'CHANGE_NEW'
      ? 'Buat PIN Baru (6 Angka)'
      : 'Ulangi PIN Baru';

  const modalSubtitle =
    modalMode === 'CREATE_FIRST'
      ? 'Pilih 6 angka yang mudah Anda ingat tapi sulit ditebak anak'
      : modalMode === 'CREATE_CONFIRM'
      ? 'Masukkan kembali PIN 6 angka yang baru saja Anda buat'
      : modalMode === 'VERIFY_DISABLE'
      ? 'Verifikasi dulu agar penguncian tidak dimatikan tanpa izin'
      : modalMode === 'VERIFY_CHANGE'
      ? 'Masukkan PIN lama sebelum mengatur PIN baru'
      : modalMode === 'CHANGE_NEW'
      ? 'Masukkan 6 angka PIN baru untuk membuka BukuKayu'
      : 'Masukkan kembali PIN baru Anda untuk memastikan cocok';

  const biometricUsable = biometricCap.supported && biometricCap.enrolled;

  const biometricHint = !biometricCap.supported
    ? 'Perangkat ini tidak memiliki sensor sidik jari atau biometrik yang didukung.'
    : !biometricCap.enrolled
    ? 'Belum ada sidik jari terdaftar. Daftarkan dulu di Pengaturan Keamanan HP Android Anda.'
    : `Bisa membuka kunci cepat memakai ${biometricCap.label.toLowerCase()} selain PIN 6 angka.`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <SectionCard
          title="Status Kunci Aplikasi"
          rightElement={
            <StatusBadge
              label={appLockEnabled ? 'Aktif' : 'Belum Aktif'}
              tone={appLockEnabled ? 'green' : 'amber'}
            />
          }
        >
          <Text style={styles.bodyText}>
            Lindungi nota, stok kayu, dan catatan kas agar tidak terhapus atau
            terubah saat HP dipegang anak kecil.
          </Text>

          <View style={styles.statusSummaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Metode Buka Kunci</Text>
              <Text style={styles.summaryVal}>
                {!appLockEnabled
                  ? 'Tidak terkunci'
                  : biometricEnabled
                  ? `PIN 6 Angka + ${biometricCap.label}`
                  : 'PIN 6 Angka'}
              </Text>
            </View>
            {appLockEnabled ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Kunci Otomatis</Text>
                <Text style={styles.summaryVal}>
                  {formatAutoLockLabel(autoLockDelaySec)}
                </Text>
              </View>
            ) : null}
          </View>
        </SectionCard>

        <SectionCard title="Pengaturan Penguncian">
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>
                Aktifkan Kunci Aplikasi (PIN)
              </Text>
              <Text style={styles.hintText}>
                Minta PIN 6 angka setiap kali BukuKayu dibuka.
              </Text>
            </View>
            <Switch
              value={appLockEnabled}
              disabled={saving}
              onValueChange={handleToggleAppLock}
              trackColor={{ false: COLORS.border, true: COLORS.oceanBorder }}
              thumbColor={appLockEnabled ? COLORS.ocean : '#F4F4F5'}
            />
          </View>

          {appLockEnabled ? (
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>
                  Buka dengan {biometricCap.label}
                </Text>
                <Text style={styles.hintText}>{biometricHint}</Text>
              </View>
              <Switch
                value={biometricEnabled}
                disabled={saving || !biometricUsable}
                onValueChange={(v) => void handleToggleBiometric(v)}
                trackColor={{ false: COLORS.border, true: COLORS.oceanBorder }}
                thumbColor={biometricEnabled ? COLORS.ocean : '#F4F4F5'}
              />
            </View>
          ) : null}
        </SectionCard>

        {appLockEnabled ? (
          <>
            <SectionCard title="Waktu Kunci Otomatis">
              <Text style={styles.bodyText}>
                Pilih berapa lama BukuKayu mengunci ulang setelah Anda keluar ke
                layar utama atau aplikasi lain:
              </Text>
              <ChipSelector
                options={AUTO_LOCK_OPTIONS}
                value={autoLockDelaySec}
                onChange={(val) => void handleSelectAutoLock(val)}
              />
            </SectionCard>

            <SectionCard title="Ubah PIN Keamanan">
              <Text style={styles.bodyText}>
                Ganti 6 angka PIN secara berkala jika diperlukan.
              </Text>
              <PrimaryButton
                title="Ubah PIN 6 Angka"
                variant="outline"
                onPress={() => openPinModal('VERIFY_CHANGE')}
                icon={<Feather name="key" size={18} color={COLORS.textPrimary} />}
              />
            </SectionCard>
          </>
        ) : null}

        <View style={styles.infoNote}>
          <MaterialCommunityIcons
            name="shield-lock-outline"
            size={22}
            color={COLORS.navy}
          />
          <Text style={styles.infoNoteText}>
            PIN disimpan terenkripsi hanya di perangkat ini dan tidak ikut
            masuk ke file cadangan (.db) maupun Google Drive.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={modalMode !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalTopBar}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={closeModal}
              disabled={saving}
              style={styles.modalCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Batal"
            >
              <Feather name="x" size={22} color={COLORS.textPrimary} />
              <Text style={styles.modalCloseText}>Batal</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <PinKeypad
              title={modalTitle}
              subtitle={modalSubtitle}
              value={modalPin}
              onChange={handleModalPinChange}
              errorMessage={modalError}
              disabled={saving}
              showBiometricButton={
                modalMode === 'VERIFY_DISABLE' &&
                biometricEnabled &&
                biometricUsable
              }
              biometricLabel={biometricCap.label}
              onBiometricPress={() => void handleVerifyDisableBiometric()}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  bodyText: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  statusSummaryBox: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SIZING.radiusMd,
    padding: 12,
    gap: 8,
  },
  summaryRow: {
    gap: 2,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
  },
  summaryVal: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
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
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  hintText: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.navyLight,
    borderRadius: SIZING.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.navyBorder,
    padding: 14,
  },
  infoNoteText: {
    flex: 1,
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.medium,
    color: COLORS.navy,
    lineHeight: 19,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  modalTopBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  modalCloseBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  modalCloseText: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
});
