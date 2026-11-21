import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONTS, SIZING, TYPOGRAPHY } from '../../theme/tokens';

interface NumberStepperProps {
  label?: string;
  value: number;
  onChange: (nextValue: number) => void;
  min?: number;
  max?: number;
  unitLabel?: string;
}

export function NumberStepper({
  label,
  value,
  onChange,
  min = 1,
  max = 99999,
  unitLabel = 'Batang',
}: NumberStepperProps) {
  const handleDecrement = () => {
    onChange(Math.max(min, value - 1));
  };

  const handleIncrement = () => {
    onChange(Math.min(max, value + 1));
  };

  const handleTextChange = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) {
      onChange(min);
      return;
    }
    const parsed = Number.parseInt(digits, 10);
    if (Number.isFinite(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)));
    }
  };

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.pillContainer}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handleDecrement}
          style={[styles.btn, value <= min && styles.btnDisabled]}
          disabled={value <= min}
          accessibilityRole="button"
          accessibilityLabel="Kurangi"
        >
          <Text style={styles.btnText}>−</Text>
        </TouchableOpacity>

        <View style={styles.centerBox}>
          <TextInput
            style={styles.input}
            value={String(value)}
            onChangeText={handleTextChange}
            keyboardType="numeric"
            textAlign="center"
          />
          <Text style={styles.unit}>{unitLabel}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handleIncrement}
          style={[styles.btn, styles.btnPrimary, value >= max && styles.btnDisabled]}
          disabled={value >= max}
          accessibilityRole="button"
          accessibilityLabel="Tambah"
        >
          <Text style={[styles.btnText, { color: COLORS.textOnDark }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SIZING.radiusPill,
    padding: 4,
    gap: 6,
  },
  btn: {
    width: 48,
    height: 48,
    borderRadius: SIZING.radiusPill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    lineHeight: 28,
  },
  centerBox: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  input: {
    minWidth: 44,
    fontSize: TYPOGRAPHY.heading,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
    paddingVertical: 4,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.semiBold,
    color: COLORS.textMuted,
  },
});
