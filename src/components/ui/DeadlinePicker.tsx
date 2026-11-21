import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONTS, SIZING, TYPOGRAPHY } from '../../theme/tokens';
import {
  DeadlineDurationUnit,
  calculateDaysFromToday,
  formatDateIndo,
  getLocalDateString,
  getOffsetDateByDuration,
  getOffsetDateString,
  isValidIsoDateString,
} from '../../utils/formatters';
import { ChipSelector } from './ChipSelector';
import { NumberStepper } from './NumberStepper';
import { PrimaryButton } from './PrimaryButton';

interface DeadlinePickerProps {
  value: string;
  onChange: (nextIsoDate: string) => void;
}

type PresetOptionValue = '7' | '14' | '30' | '45' | '60' | '90' | 'CUSTOM';

const DEADLINE_PRESETS: readonly { label: string; value: PresetOptionValue }[] =
  [
    { label: '+7 Hari', value: '7' },
    { label: '+14 Hari', value: '14' },
    { label: '+30 Hari', value: '30' },
    { label: '+45 Hari', value: '45' },
    { label: '+60 Hari (2 Bln)', value: '60' },
    { label: '+90 Hari (3 Bln)', value: '90' },
    { label: 'Atur Sendiri', value: 'CUSTOM' },
  ];

const DURATION_UNITS: readonly { label: string; value: DeadlineDurationUnit }[] =
  [
    { label: 'Hari', value: 'DAYS' },
    { label: 'Minggu', value: 'WEEKS' },
    { label: 'Bulan', value: 'MONTHS' },
  ];

const WEEKDAY_HEADERS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const FULL_MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function parseYearMonth(isoDate: string): { year: number; monthIndex: number } {
  if (isValidIsoDateString(isoDate)) {
    const [y, m] = isoDate.trim().split('-').map(Number);
    return { year: y, monthIndex: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

export function DeadlinePicker({ value, onChange }: DeadlinePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetOptionValue>(() => {
    const diff = calculateDaysFromToday(value);
    if (diff === 7 || diff === 14 || diff === 30 || diff === 45 || diff === 60 || diff === 90) {
      return String(diff) as PresetOptionValue;
    }
    return 'CUSTOM';
  });

  const [customAmount, setCustomAmount] = useState<number>(2);
  const [customUnit, setCustomUnit] = useState<DeadlineDurationUnit>('MONTHS');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const initialYm = parseYearMonth(value);
  const [viewYear, setViewYear] = useState(initialYm.year);
  const [viewMonth, setViewMonth] = useState(initialYm.monthIndex);

  const todayIso = getLocalDateString(new Date());
  const daysRemaining = useMemo(() => calculateDaysFromToday(value), [value]);

  const countdownBadge = useMemo(() => {
    if (daysRemaining === null) {
      return null;
    }
    if (daysRemaining > 0) {
      return {
        text: `${daysRemaining} hari lagi`,
        bg: COLORS.oceanLight,
        color: COLORS.ocean,
      };
    }
    if (daysRemaining === 0) {
      return {
        text: 'Hari ini',
        bg: COLORS.greenLight,
        color: COLORS.green,
      };
    }
    return {
      text: `Lewat ${Math.abs(daysRemaining)} hari`,
      bg: COLORS.redLight,
      color: COLORS.red,
    };
  }, [daysRemaining]);

  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) {
      cells.push(null);
    }
    for (let day = 1; day <= totalDays; day++) {
      cells.push(day);
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }, [viewYear, viewMonth]);

  const handleSelectPreset = (nextPreset: PresetOptionValue) => {
    setSelectedPreset(nextPreset);
    if (nextPreset === 'CUSTOM') {
      const nextDate = getOffsetDateByDuration(customAmount, customUnit);
      onChange(nextDate);
      return;
    }
    onChange(getOffsetDateString(Number(nextPreset)));
  };

  const handleCustomAmountChange = (nextAmount: number) => {
    setCustomAmount(nextAmount);
    setSelectedPreset('CUSTOM');
    onChange(getOffsetDateByDuration(nextAmount, customUnit));
  };

  const handleCustomUnitChange = (nextUnit: DeadlineDurationUnit) => {
    setCustomUnit(nextUnit);
    setSelectedPreset('CUSTOM');
    onChange(getOffsetDateByDuration(customAmount, nextUnit));
  };

  const openCalendar = () => {
    const ym = parseYearMonth(value);
    setViewYear(ym.year);
    setViewMonth(ym.monthIndex);
    setCalendarOpen(true);
  };

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const pickCalendarDay = (day: number) => {
    const picked = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(
      day
    ).padStart(2, '0')}`;
    setSelectedPreset('CUSTOM');
    onChange(picked);
    setCalendarOpen(false);
  };

  const unitLabel =
    customUnit === 'DAYS' ? 'Hari' : customUnit === 'WEEKS' ? 'Minggu' : 'Bulan';

  return (
    <View style={styles.container}>
      <ChipSelector
        options={DEADLINE_PRESETS}
        value={selectedPreset}
        onChange={handleSelectPreset}
        scrollable
      />

      {selectedPreset === 'CUSTOM' ? (
        <View style={styles.customBox}>
          <Text style={styles.customTitle}>Lama Pengerjaan Bebas</Text>
          <NumberStepper
            value={customAmount}
            onChange={handleCustomAmountChange}
            min={1}
            max={1000}
            unitLabel={unitLabel}
          />
          <ChipSelector
            options={DURATION_UNITS}
            value={customUnit}
            onChange={handleCustomUnitChange}
          />
        </View>
      ) : null}

      <TouchableOpacity
        activeOpacity={0.78}
        onPress={openCalendar}
        style={styles.dateBox}
        accessibilityRole="button"
        accessibilityLabel="Pilih tanggal selesai dari kalender"
      >
        <View style={styles.dateLeft}>
          <Feather name="calendar" size={19} color={COLORS.ocean} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.dateDisplay}>{formatDateIndo(value)}</Text>
            <Text style={styles.dateIsoSub}>{value}</Text>
          </View>
        </View>

        <View style={styles.dateRight}>
          {countdownBadge ? (
            <View
              style={[
                styles.countdownPill,
                { backgroundColor: countdownBadge.bg },
              ]}
            >
              <Text
                style={[styles.countdownText, { color: countdownBadge.color }]}
              >
                {countdownBadge.text}
              </Text>
            </View>
          ) : null}
          <Text style={styles.pickLink}>Kalender</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={calendarOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCalendarOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <Text style={styles.modalTitle}>Pilih Tanggal Selesai</Text>

              <View style={styles.quickJumpRow}>
                {[
                  { label: '+2 Bln', months: 2 },
                  { label: '+3 Bln', months: 3 },
                  { label: '+6 Bln', months: 6 },
                  { label: '+1 Thn', months: 12 },
                ].map((jump) => (
                  <TouchableOpacity
                    key={jump.label}
                    activeOpacity={0.78}
                    onPress={() => {
                      const nextDate = getOffsetDateByDuration(
                        jump.months,
                        'MONTHS'
                      );
                      setSelectedPreset('CUSTOM');
                      onChange(nextDate);
                      const ym = parseYearMonth(nextDate);
                      setViewYear(ym.year);
                      setViewMonth(ym.monthIndex);
                    }}
                    style={styles.quickJumpChip}
                  >
                    <Text style={styles.quickJumpText}>{jump.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.monthHeader}>
                <TouchableOpacity
                  activeOpacity={0.78}
                  onPress={() => shiftMonth(-1)}
                  style={styles.monthNavBtn}
                  accessibilityLabel="Bulan sebelumnya"
                >
                  <Feather name="chevron-left" size={20} color={COLORS.navy} />
                </TouchableOpacity>

                <Text style={styles.monthTitle}>
                  {FULL_MONTHS_ID[viewMonth]} {viewYear}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.78}
                  onPress={() => shiftMonth(1)}
                  style={styles.monthNavBtn}
                  accessibilityLabel="Bulan berikutnya"
                >
                  <Feather name="chevron-right" size={20} color={COLORS.navy} />
                </TouchableOpacity>
              </View>

              <View style={styles.weekRow}>
                {WEEKDAY_HEADERS.map((wd) => (
                  <Text key={wd} style={styles.weekHeaderCell}>
                    {wd}
                  </Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {calendarCells.map((day, idx) => {
                  if (day === null) {
                    return <View key={`empty-${idx}`} style={styles.dayCell} />;
                  }
                  const iso = `${viewYear}-${String(viewMonth + 1).padStart(
                    2,
                    '0'
                  )}-${String(day).padStart(2, '0')}`;
                  const isSelected = iso === value.trim();
                  const isToday = iso === todayIso;

                  return (
                    <View key={iso} style={styles.dayCell}>
                      <TouchableOpacity
                        activeOpacity={0.78}
                        onPress={() => pickCalendarDay(day)}
                        style={[
                          styles.dayBtn,
                          isToday && !isSelected && styles.dayBtnToday,
                          isSelected && styles.dayBtnSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isToday && !isSelected && styles.dayTextToday,
                            isSelected && styles.dayTextSelected,
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.manualLabel}>
                Atau ketik tanggal langsung (YYYY-MM-DD)
              </Text>
              <TextInput
                style={styles.manualInput}
                value={value}
                onChangeText={(txt) => {
                  setSelectedPreset('CUSTOM');
                  onChange(txt);
                  if (isValidIsoDateString(txt)) {
                    const ym = parseYearMonth(txt);
                    setViewYear(ym.year);
                    setViewMonth(ym.monthIndex);
                  }
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
              />

              <PrimaryButton
                title="Selesai"
                variant="primary"
                onPress={() => setCalendarOpen(false)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  customBox: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SIZING.radiusMd,
    padding: 12,
    gap: 10,
  },
  customTitle: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.navy,
  },
  dateBox: {
    minHeight: SIZING.inputMinHeight,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: SIZING.radiusMd,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dateLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateDisplay: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  dateIsoSub: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    fontVariant: ['tabular-nums'],
  },
  dateRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  countdownPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: SIZING.radiusPill,
  },
  countdownText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    fontVariant: ['tabular-nums'],
  },
  pickLink: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.ocean,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '90%',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.heading,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
  },
  quickJumpRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickJumpChip: {
    flex: 1,
    minHeight: 38,
    borderRadius: SIZING.radiusPill,
    backgroundColor: COLORS.oceanLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickJumpText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.ocean,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  monthNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: TYPOGRAPHY.subhead,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekHeaderCell: {
    width: '14.2857%',
    textAlign: 'center',
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    alignItems: 'center',
    paddingVertical: 3,
  },
  dayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBtnToday: {
    borderWidth: 1.5,
    borderColor: COLORS.ocean,
  },
  dayBtnSelected: {
    backgroundColor: COLORS.navy,
  },
  dayText: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  dayTextToday: {
    color: COLORS.ocean,
    fontFamily: FONTS.extraBold,
  },
  dayTextSelected: {
    color: COLORS.textOnDark,
    fontFamily: FONTS.extraBold,
  },
  manualLabel: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },
  manualInput: {
    minHeight: SIZING.inputMinHeight,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: SIZING.radiusMd,
    paddingHorizontal: 14,
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
