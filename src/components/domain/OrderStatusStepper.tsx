import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONTS, SIZING, TYPOGRAPHY } from '../../theme/tokens';
import {
  FURNITURE_STATUS_STEPS,
  FurnitureOrderStatus,
} from '../../types/domain';
import { PrimaryButton } from '../ui/PrimaryButton';

interface OrderStatusStepperProps {
  currentStatus: FurnitureOrderStatus;
  onSelectStatus: (nextStatus: FurnitureOrderStatus) => void;
  updating?: boolean;
}

export function OrderStatusStepper({
  currentStatus,
  onSelectStatus,
  updating = false,
}: OrderStatusStepperProps) {
  const currentIndex = FURNITURE_STATUS_STEPS.findIndex(
    (s) => s.key === currentStatus
  );
  const nextStep =
    currentIndex >= 0 && currentIndex < FURNITURE_STATUS_STEPS.length - 1
      ? FURNITURE_STATUS_STEPS[currentIndex + 1]
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.stepsList}>
        {FURNITURE_STATUS_STEPS.map((step, index) => {
          const isDone = index < currentIndex || currentStatus === 'COMPLETED';
          const isCurrent = index === currentIndex && currentStatus !== 'COMPLETED';

          return (
            <TouchableOpacity
              key={step.key}
              activeOpacity={0.78}
              disabled={updating || step.key === currentStatus}
              onPress={() => onSelectStatus(step.key)}
              style={[
                styles.stepRow,
                isCurrent && styles.stepRowCurrent,
                isDone && styles.stepRowDone,
              ]}
            >
              <View
                style={[
                  styles.dot,
                  isDone && styles.dotDone,
                  isCurrent && styles.dotCurrent,
                ]}
              >
                {isDone ? (
                  <Feather name="check" size={15} color={COLORS.textOnDark} />
                ) : (
                  <Text
                    style={[
                      styles.dotText,
                      isCurrent && { color: COLORS.textOnDark },
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>

              <Text
                style={[
                  styles.stepLabel,
                  isCurrent && styles.stepLabelCurrent,
                  isDone && styles.stepLabelDone,
                ]}
              >
                {step.label}
              </Text>

              {isCurrent ? (
                <Text style={styles.activeTag}>Sekarang</Text>
              ) : isDone ? (
                <Text style={styles.doneTag}>Sudah</Text>
              ) : (
                <Text style={styles.tapHint}>Ketuk</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {nextStep ? (
        <PrimaryButton
          title={`Lanjut ke: ${nextStep.label}`}
          variant={nextStep.key === 'COMPLETED' ? 'success' : 'ocean'}
          loading={updating}
          onPress={() => onSelectStatus(nextStep.key)}
          icon={<Feather name="arrow-right" size={19} color={COLORS.textOnDark} />}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  stepsList: {
    gap: 8,
  },
  stepRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: SIZING.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 12,
  },
  stepRowCurrent: {
    borderColor: COLORS.ocean,
    backgroundColor: COLORS.oceanLight,
  },
  stepRowDone: {
    borderColor: COLORS.greenBorder,
    backgroundColor: COLORS.greenLight,
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotDone: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  dotCurrent: {
    backgroundColor: COLORS.ocean,
    borderColor: COLORS.ocean,
  },
  dotText: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.extraBold,
    color: COLORS.textSecondary,
  },
  stepLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  stepLabelCurrent: {
    fontFamily: FONTS.extraBold,
    color: COLORS.navy,
  },
  stepLabelDone: {
    fontFamily: FONTS.bold,
    color: COLORS.green,
  },
  activeTag: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.extraBold,
    color: COLORS.navy,
  },
  doneTag: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.green,
  },
  tapHint: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
});
