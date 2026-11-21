import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, SIZING, TYPOGRAPHY } from '../../theme/tokens';

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
    const next = Math.max(min, value - 1);
    onChange(next);
  };

  const handleIncrement = () => {
    const next = Math.min(max, value + 1);
    onChange(next);
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
      <View style={styles.row}>
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
          style={[styles.btn, value >= max && styles.btnDisabled]}
          disabled={value >= max}
          accessibilityRole="button"
          accessibilityLabel="Tambah"
        >
          <Text style={styles.btnText}>+</Text>
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
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btn: {
    width: 54,
    height: 54,
    borderRadius: SIZING.radiusMd,
    backgroundColor: COLORS.amber,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textOnDark,
    lineHeight: 32,
  },
  centerBox: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    borderRadius: SIZING.radiusMd,
    paddingHorizontal: 12,
    gap: 6,
  },
  input: {
    minWidth: 50,
    fontSize: TYPOGRAPHY.heading,
    fontWeight: '800',
    color: COLORS.textPrimary,
    paddingVertical: 6,
  },
  unit: {
    fontSize: TYPOGRAPHY.label,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
});
