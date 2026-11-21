import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, SIZING, TYPOGRAPHY } from '../../theme/tokens';

export type BadgeTone = 'green' | 'red' | 'amber' | 'blue' | 'neutral';

interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
}

const TONE_COLORS: Record<
  BadgeTone,
  { bg: string; text: string }
> = {
  green: {
    bg: COLORS.greenLight,
    text: COLORS.green,
  },
  red: {
    bg: COLORS.redLight,
    text: COLORS.red,
  },
  amber: {
    bg: COLORS.navyLight,
    text: COLORS.navy,
  },
  blue: {
    bg: COLORS.oceanLight,
    text: COLORS.ocean,
  },
  neutral: {
    bg: COLORS.surfaceSubtle,
    text: COLORS.textSecondary,
  },
};

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const palette = TONE_COLORS[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: SIZING.radiusPill,
  },
  text: {
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
});
