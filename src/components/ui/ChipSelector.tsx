import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, SIZING, TYPOGRAPHY } from '../../theme/tokens';

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
        activeOpacity={0.75}
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: SIZING.radiusMd,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.amberLight,
    borderColor: COLORS.amber,
  },
  chipText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.amberDark,
    fontWeight: '700',
  },
});
