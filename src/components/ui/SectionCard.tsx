import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { COLORS, SHADOWS, SIZING, TYPOGRAPHY } from '../../theme/tokens';

interface SectionCardProps {
  title?: string;
  rightElement?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionCard({
  title,
  rightElement,
  children,
  style,
}: SectionCardProps) {
  return (
    <View style={[styles.card, style]}>
      {title || rightElement ? (
        <View style={styles.headerRow}>
          {title ? <Text style={styles.title}>{title}</Text> : <View />}
          {rightElement}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZING.radiusLg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZING.spacingMd,
    gap: 10,
    ...SHADOWS.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: TYPOGRAPHY.subhead,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
});
