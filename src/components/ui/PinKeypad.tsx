import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONTS, SHADOWS, TYPOGRAPHY } from '../../theme/tokens';
import { PIN_LENGTH } from '../../utils/pinLockHelpers';

interface PinKeypadProps {
  title: string;
  subtitle?: string;
  value: string;
  onChange: (nextPin: string) => void;
  errorMessage?: string | null;
  disabled?: boolean;
  showBiometricButton?: boolean;
  biometricLabel?: string;
  onBiometricPress?: () => void;
}

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

export function PinKeypad({
  title,
  subtitle,
  value,
  onChange,
  errorMessage,
  disabled = false,
  showBiometricButton = false,
  biometricLabel = 'Sidik Jari',
  onBiometricPress,
}: PinKeypadProps) {
  const handleDigit = (digit: string) => {
    if (disabled || value.length >= PIN_LENGTH) {
      return;
    }
    onChange(`${value}${digit}`);
  };

  const handleBackspace = () => {
    if (disabled || value.length === 0) {
      return;
    }
    onChange(value.slice(0, -1));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <View
        style={styles.dotsRow}
        accessibilityLabel={`${value.length} dari ${PIN_LENGTH} angka terisi`}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, index) => {
          const filled = index < value.length;
          return (
            <View
              key={index}
              style={[
                styles.dot,
                filled && styles.dotFilled,
                Boolean(errorMessage) && styles.dotError,
              ]}
            />
          );
        })}
      </View>

      <View style={styles.errorSlot}>
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
      </View>

      <View style={styles.grid}>
        {DIGIT_ROWS.map((row) => (
          <View key={row.join('-')} style={styles.keyRow}>
            {row.map((digit) => (
              <TouchableOpacity
                key={digit}
                activeOpacity={0.72}
                disabled={disabled}
                onPress={() => handleDigit(digit)}
                style={[styles.keyBtn, disabled && styles.keyBtnDisabled]}
                accessibilityRole="button"
                accessibilityLabel={`Angka ${digit}`}
              >
                <Text style={styles.keyText}>{digit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.keyRow}>
          {showBiometricButton && onBiometricPress ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onBiometricPress}
              style={[styles.keyBtn, styles.biometricKeyBtn]}
              accessibilityRole="button"
              accessibilityLabel={`Buka dengan ${biometricLabel}`}
            >
              <MaterialCommunityIcons
                name="fingerprint"
                size={30}
                color={COLORS.navy}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.keySpacer} />
          )}

          <TouchableOpacity
            activeOpacity={0.72}
            disabled={disabled}
            onPress={() => handleDigit('0')}
            style={[styles.keyBtn, disabled && styles.keyBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Angka 0"
          >
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.72}
            disabled={disabled || value.length === 0}
            onPress={handleBackspace}
            style={[
              styles.keyBtn,
              styles.utilityKeyBtn,
              (disabled || value.length === 0) && styles.keyBtnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Hapus angka terakhir"
          >
            <Feather name="delete" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.heading,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 22,
    marginBottom: 8,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
  },
  dotFilled: {
    borderColor: COLORS.navy,
    backgroundColor: COLORS.navy,
  },
  dotError: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.redLight,
  },
  errorSlot: {
    minHeight: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.red,
    textAlign: 'center',
  },
  grid: {
    gap: 14,
    alignItems: 'center',
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  keyBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  biometricKeyBtn: {
    backgroundColor: COLORS.navyLight,
    borderColor: COLORS.navyBorder,
  },
  utilityKeyBtn: {
    backgroundColor: COLORS.surfaceSubtle,
  },
  keyBtnDisabled: {
    opacity: 0.45,
  },
  keySpacer: {
    width: 72,
    height: 72,
  },
  keyText: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
