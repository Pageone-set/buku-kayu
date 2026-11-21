import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { COLORS, FONTS, SHADOWS, SIZING, TYPOGRAPHY } from '../../theme/tokens';

export type ButtonVariant =
  | 'primary'
  | 'ocean'
  | 'success'
  | 'danger'
  | 'outline'
  | 'ghost';

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
    variant === 'ocean' && styles.ocean,
    variant === 'success' && styles.success,
    variant === 'danger' && styles.danger,
    variant === 'outline' && styles.outline,
    variant === 'ghost' && styles.ghost,
    size === 'lg' &&
      (variant === 'primary' || variant === 'ocean') &&
      SHADOWS.floating,
    isDisabled && styles.disabled,
    style,
  ];

  const isLightBg = variant === 'outline' || variant === 'ghost';
  const textColor = isLightBg ? COLORS.textPrimary : COLORS.textOnDark;

  return (
    <TouchableOpacity
      activeOpacity={0.82}
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
              { color: variant === 'ghost' ? COLORS.ocean : textColor },
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: SIZING.radiusPill,
  },
  primary: {
    backgroundColor: COLORS.navy,
  },
  ocean: {
    backgroundColor: COLORS.ocean,
  },
  success: {
    backgroundColor: COLORS.green,
  },
  danger: {
    backgroundColor: COLORS.red,
  },
  outline: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.48,
  },
  label: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.bold,
    textAlign: 'center',
  },
  labelLg: {
    fontSize: TYPOGRAPHY.subhead,
    fontFamily: FONTS.extraBold,
  },
});
