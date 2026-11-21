import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS, getWoodSwatchColor } from '../../theme/tokens';

interface WoodSwatchBadgeProps {
  woodType: string;
  colorHex?: string;
  size?: number;
  ring?: boolean;
}

export function WoodSwatchBadge({
  woodType,
  colorHex,
  size = 18,
  ring = true,
}: WoodSwatchBadgeProps) {
  const color = colorHex || getWoodSwatchColor(woodType);
  return (
    <View
      style={[
        styles.outer,
        {
          width: size + (ring ? 8 : 0),
          height: size + (ring ? 8 : 0),
          borderRadius: 999,
          borderWidth: ring ? 1.5 : 0,
          borderColor: ring ? COLORS.borderStrong : 'transparent',
          backgroundColor: ring ? COLORS.surface : 'transparent',
        },
      ]}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
