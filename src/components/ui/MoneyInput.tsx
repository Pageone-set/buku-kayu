import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS, SIZING, TYPOGRAPHY } from '../../theme/tokens';
import { formatRupiah, parseRupiahInput } from '../../utils/formatters';

interface MoneyInputProps {
  label?: string;
  value: number;
  onChangeValue: (amount: number) => void;
  placeholder?: string;
  helperText?: string;
}

export function MoneyInput({
  label,
  value,
  onChangeValue,
  placeholder = '0',
  helperText,
}: MoneyInputProps) {
  const displayRaw = value > 0 ? String(Math.round(value)) : '';

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <Text style={styles.prefix}>Rp</Text>
        <TextInput
          style={styles.input}
          value={displayRaw}
          onChangeText={(text) => onChangeValue(parseRupiahInput(text))}
          keyboardType="numeric"
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
        />
      </View>
      <Text style={styles.preview}>
        {helperText ? `${helperText} • ` : ''}
        {formatRupiah(value)}
      </Text>
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
  inputRow: {
    minHeight: SIZING.inputMinHeight,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    borderRadius: SIZING.radiusMd,
    paddingHorizontal: 14,
  },
  prefix: {
    fontSize: TYPOGRAPHY.subhead,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: TYPOGRAPHY.subhead,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingVertical: 10,
  },
  preview: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.amberDark,
  },
});
