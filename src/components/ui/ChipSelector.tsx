import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONTS, SIZING, TYPOGRAPHY } from '../../theme/tokens';

export interface ChipOption<T extends string | number> {
  label: string;
  value: T;
}

interface ChipSelectorProps<T extends string | number> {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  scrollable?: boolean;
}

export function ChipSelector<T extends string | number>({
  options,
  value,
  onChange,
  scrollable = false,
}: ChipSelectorProps<T>) {
  const content = options.map((opt) => {
    const active = opt.value === value;
    return (
      <TouchableOpacity
        key={String(opt.value)}
        activeOpacity={0.78}
        onPress={() => onChange(opt.value)}
        style={[styles.chip, active && styles.chipActive]}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>
          {opt.label}
        </Text>
      </TouchableOpacity>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}
      >
        {content}
      </ScrollView>
    );
  }

  return <View style={styles.wrapRow}>{content}</View>;
}

const styles = StyleSheet.create({
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scrollRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    minHeight: SIZING.chipMinHeight,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: SIZING.radiusPill,
    backgroundColor: COLORS.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.charcoal,
  },
  chipText: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.textOnDark,
    fontFamily: FONTS.bold,
  },
});
