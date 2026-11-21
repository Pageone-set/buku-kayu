import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { COLORS, SIZING, TYPOGRAPHY } from '../../theme/tokens';

export type ButtonVariant = 'primary' | 'success' | 'danger' | 'outline' | 'ghost';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const minHeight = size === 'lg' ? SIZING.ctaMinHeight : SIZING.buttonMinHeight;

  const containerStyle = [
    styles.base,
    { minHeight },
    variant === 'primary' && styles.primary,
    variant === 'success' && styles.success,
    variant === 'danger' && styles.danger,
    variant === 'outline' && styles.outline,
    variant === 'ghost' && styles.ghost,
    isDisabled && styles.disabled,
    style,
  ];

  const isLightBg = variant === 'outline' || variant === 'ghost';
  const textColor = isLightBg ? COLORS.textPrimary : COLORS.textOnDark;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={containerStyle}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.label,
              size === 'lg' && styles.labelLg,
              { color: variant === 'ghost' ? COLORS.amber : textColor },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: SIZING.radiusMd,
  },
  primary: {
    backgroundColor: COLORS.amber,
  },
  success: {
    backgroundColor: COLORS.green,
  },
  danger: {
    backgroundColor: COLORS.red,
  },
  outline: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  labelLg: {
    fontSize: TYPOGRAPHY.subhead,
  },
});
