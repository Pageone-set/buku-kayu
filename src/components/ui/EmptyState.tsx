import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SIZING, TYPOGRAPHY } from '../../theme/tokens';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <View style={styles.box}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.borderStrong,
    borderRadius: SIZING.radiusLg,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    marginBottom: 4,
  },
  title: {
    fontSize: TYPOGRAPHY.subhead,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  action: {
    marginTop: 8,
    width: '100%',
  },
});
