import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, SIZING, TYPOGRAPHY } from '../../theme/tokens';

interface DimensionSpecStripProps {
  lengthCm: number;
  widthCm: number;
  thicknessCm: number;
  compact?: boolean;
}

export function DimensionSpecStrip({
  lengthCm,
  widthCm,
  thicknessCm,
  compact = false,
}: DimensionSpecStripProps) {
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <View style={styles.cell}>
        <View style={styles.iconLabel}>
          <Feather name="maximize-2" size={13} color={COLORS.ocean} />
          <Text style={styles.label}>Panjang</Text>
        </View>
        <Text style={[styles.value, compact && styles.valueCompact]}>
          {lengthCm > 0 ? `${lengthCm} cm` : '-'}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.cell}>
        <View style={styles.iconLabel}>
          <Feather name="sliders" size={13} color={COLORS.ocean} />
          <Text style={styles.label}>Lebar</Text>
        </View>
        <Text style={[styles.value, compact && styles.valueCompact]}>
          {widthCm > 0 ? `${widthCm} cm` : '-'}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.cell}>
        <View style={styles.iconLabel}>
          <Feather name="layers" size={13} color={COLORS.ocean} />
          <Text style={styles.label}>Tebal</Text>
        </View>
        <Text style={[styles.value, compact && styles.valueCompact]}>
          {thicknessCm > 0 ? `${thicknessCm} cm` : '-'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SIZING.radiusMd,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  rowCompact: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.textMuted,
  },
  value: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  valueCompact: {
    fontSize: TYPOGRAPHY.label,
  },
  divider: {
    width: 1,
    height: 26,
    backgroundColor: COLORS.borderStrong,
  },
});
