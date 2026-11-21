import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS, FONTS, SIZING, TYPOGRAPHY } from '../../theme/tokens';
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
        <View style={styles.prefixPill}>
          <Text style={styles.prefix}>Rp</Text>
        </View>
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
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  inputRow: {
    minHeight: SIZING.inputMinHeight,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: SIZING.radiusMd,
    paddingHorizontal: 10,
    gap: 10,
  },
  prefixPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SIZING.radiusSm,
    backgroundColor: COLORS.surfaceSubtle,
  },
  prefix: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },
  input: {
    flex: 1,
    fontSize: TYPOGRAPHY.subhead,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
    paddingVertical: 10,
    fontVariant: ['tabular-nums'],
  },
  preview: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.semiBold,
    color: COLORS.ocean,
  },
});
