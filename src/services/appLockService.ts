import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useAppStore } from '../store/useAppStore';
import { createPinRecord, verifyPinRecord } from '../utils/pinLockHelpers';

const PIN_STORAGE_KEY = 'bukukayu_lock_pin_v1';
const CONFIG_STORAGE_KEY = 'bukukayu_lock_config_v1';

export interface AppLockConfig {
  enabled: boolean;
  biometricEnabled: boolean;
  autoLockDelaySec: number;
}

export interface BiometricCapability {
  supported: boolean;
  enrolled: boolean;
  label: string;
}

const DEFAULT_CONFIG: AppLockConfig = {
  enabled: false,
  biometricEnabled: false,
  autoLockDelaySec: 0,
};

function sanitizeConfig(raw: Partial<AppLockConfig> | null): AppLockConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_CONFIG };
  }
  const delay =
    typeof raw.autoLockDelaySec === 'number' &&
    Number.isFinite(raw.autoLockDelaySec) &&
    raw.autoLockDelaySec >= 0
      ? Math.round(raw.autoLockDelaySec)
      : 0;
  return {
    enabled: Boolean(raw.enabled),
    biometricEnabled: Boolean(raw.enabled && raw.biometricEnabled),
    autoLockDelaySec: delay,
  };
}

export async function loadAppLockConfig(): Promise<AppLockConfig> {
  try {
    const [rawConfig, storedPin] = await Promise.all([
      SecureStore.getItemAsync(CONFIG_STORAGE_KEY),
      SecureStore.getItemAsync(PIN_STORAGE_KEY),
    ]);

    if (!rawConfig) {
      return { ...DEFAULT_CONFIG };
    }

    const parsed = sanitizeConfig(
      JSON.parse(rawConfig) as Partial<AppLockConfig>
    );

    if (parsed.enabled && !storedPin) {
      const degraded: AppLockConfig = {
        ...parsed,
        enabled: false,
        biometricEnabled: false,
      };
      await saveAppLockConfig(degraded);
      return degraded;
    }

    return parsed;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveAppLockConfig(
  config: AppLockConfig
): Promise<AppLockConfig> {
  const clean = sanitizeConfig(config);
  await SecureStore.setItemAsync(CONFIG_STORAGE_KEY, JSON.stringify(clean));
  return clean;
}

export async function setupPinAndEnableLock(
  pin: string,
  enableBiometric = false
): Promise<AppLockConfig> {
  const pinRecord = createPinRecord(pin);
  const current = await loadAppLockConfig();
  await SecureStore.setItemAsync(PIN_STORAGE_KEY, pinRecord);
  return saveAppLockConfig({
    enabled: true,
    biometricEnabled: enableBiometric,
    autoLockDelaySec: current.autoLockDelaySec,
  });
}

export async function changeStoredPin(newPin: string): Promise<void> {
  const pinRecord = createPinRecord(newPin);
  await SecureStore.setItemAsync(PIN_STORAGE_KEY, pinRecord);
}

export async function verifyStoredPin(pin: string): Promise<boolean> {
  const storedRecord = await SecureStore.getItemAsync(PIN_STORAGE_KEY);
  return verifyPinRecord(pin, storedRecord);
}

export async function disableAppLock(): Promise<AppLockConfig> {
  try {
    await SecureStore.deleteItemAsync(PIN_STORAGE_KEY);
  } catch {
    // Abaikan jika key belum ada
  }
  return saveAppLockConfig({ ...DEFAULT_CONFIG });
}

export async function getBiometricCapability(): Promise<BiometricCapability> {
  try {
    const [supported, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    const hasFingerprint = types.includes(
      LocalAuthentication.AuthenticationType.FINGERPRINT
    );
    const hasFace = types.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
    );

    let label = 'Sidik Jari / Biometrik';
    if (hasFingerprint && hasFace) {
      label = 'Sidik Jari / Wajah';
    } else if (hasFingerprint) {
      label = 'Sidik Jari';
    } else if (hasFace) {
      label = 'Wajah / Biometrik';
    }

    return { supported, enrolled, label };
  } catch {
    return {
      supported: false,
      enrolled: false,
      label: 'Sidik Jari / Biometrik',
    };
  }
}

export async function authenticateWithBiometrics(
  promptMessage?: string
): Promise<{ success: boolean; error?: string }> {
  const store = useAppStore.getState();
  store.setBiometricPromptActive(true);
  try {
    const capability = await getBiometricCapability();
    if (!capability.supported || !capability.enrolled) {
      return { success: false, error: 'not_enrolled' };
    }

    // disableDeviceFallback mencegah buka paksa memakai pola/PIN layar HP yang sering diketahui anak
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage ?? 'Buka kunci BukuKayu',
      cancelLabel: 'Pakai PIN',
      fallbackLabel: 'Pakai PIN',
      disableDeviceFallback: true,
    });

    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.error };
  } catch {
    return { success: false, error: 'unknown' };
  } finally {
    // Beri jeda singkat agar event fokus Android saat dialog biometrik menutup tidak memicu kunci ulang
    setTimeout(() => {
      useAppStore.getState().setBiometricPromptActive(false);
    }, 350);
  }
}
