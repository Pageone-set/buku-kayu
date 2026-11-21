import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../../theme/tokens';

export type BadgeTone = 'green' | 'red' | 'amber' | 'blue' | 'neutral';

interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
}

const TONE_COLORS: Record<
  BadgeTone,
  { bg: string; border: string; text: string }
> = {
  green: {
    bg: COLORS.greenLight,
    border: COLORS.greenBorder,
    text: COLORS.green,
  },
  red: {
    bg: COLORS.redLight,
    border: COLORS.redBorder,
    text: COLORS.red,
  },
  amber: {
    bg: COLORS.amberLight,
    border: COLORS.amberBorder,
    text: COLORS.amberDark,
  },
  blue: {
    bg: COLORS.blueLight,
    border: '#93C5FD',
    text: COLORS.blue,
  },
  neutral: {
    bg: COLORS.surfaceSubtle,
    border: COLORS.border,
    text: COLORS.textSecondary,
  },
};

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const palette = TONE_COLORS[tone];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
    >
      <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  text: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },
});
