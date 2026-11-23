import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChipSelector } from '../../components/ui/ChipSelector';
import { EmptyState } from '../../components/ui/EmptyState';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { listWoodSales } from '../../db/salesRepo';
import { useAppStore } from '../../store/useAppStore';
import {
  COLORS,
  FONTS,
  SHADOWS,
  SIZING,
  TYPOGRAPHY,
  getFloatingTabBarClearance,
} from '../../theme/tokens';
import { WoodPaymentStatus, WoodSale } from '../../types/domain';
import { calculateRemainingAmount } from '../../utils/cubicCalculator';
import {
  formatDateTimeIndo,
  formatRupiah,
  formatVolumeM3,
} from '../../utils/formatters';

type SalesFilter = 'ALL' | WoodPaymentStatus;

const FILTER_OPTIONS: readonly { label: string; value: SalesFilter }[] = [
  { label: 'Semua Nota', value: 'ALL' },
  { label: 'Kasbon / Kurang Bayar', value: 'PARTIAL' },
  { label: 'Lunas', value: 'PAID' },
];

export default function SalesListScreen() {
  const insets = useSafeAreaInsets();
  const dbRevision = useAppStore((s) => s.dbRevision);
  const [filter, setFilter] = useState<SalesFilter>('ALL');
  const [search, setSearch] = useState('');
  const [sales, setSales] = useState<WoodSale[]>([]);

  const loadSales = useCallback(async () => {
    try {
      const rows = await listWoodSales(filter, search);
      setSales(rows);
    } catch {
      // ignore transient error
    }
  }, [filter, search]);

  useFocusEffect(
    useCallback(() => {
      void loadSales();
    }, [loadSales])
  );

  useEffect(() => {
    void loadSales();
  }, [dbRevision, loadSales]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topSection}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Penjualan Kayu</Text>
          <PrimaryButton
            title="+ Jual Kayu"
            onPress={() => router.push('/sale/new')}
            style={styles.addBtn}
          />
        </View>

        <View style={styles.searchBox}>
          <Feather name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Cari nama pembeli atau nomor nota..."
            placeholderTextColor={COLORS.textMuted}
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ChipSelector
          options={FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
          scrollable
        />
      </View>

      <FlatList
        data={sales}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: getFloatingTabBarClearance(insets.bottom) },
        ]}
        renderItem={({ item }) => {
          const remaining = calculateRemainingAmount(
            item.total_amount,
            item.paid_amount
          );
          const isPaid = item.payment_status === 'PAID' && remaining === 0;

          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push(`/sale/${item.id}`)}
              style={styles.card}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardMain}>
                  <Text style={styles.customerName}>{item.customer_name}</Text>
                  <Text style={styles.metaText}>
                    {item.invoice_number} • {formatDateTimeIndo(item.created_at)}
                  </Text>
                </View>
                <StatusBadge
                  label={isPaid ? 'LUNAS' : 'KASBON'}
                  tone={isPaid ? 'green' : 'red'}
                />
              </View>

              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.volumeLabel}>
                    Total {formatVolumeM3(item.total_volume_m3)}
                  </Text>
                  <Text style={styles.totalAmount}>
                    {formatRupiah(item.total_amount)}
                  </Text>
                </View>

                {!isPaid ? (
                  <View style={styles.remainingBox}>
                    <Text style={styles.remainingLabel}>Kurang Bayar</Text>
                    <Text style={styles.remainingAmount}>
                      {formatRupiah(remaining)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon={
              <Feather name="file-text" size={32} color={COLORS.textMuted} />
            }
            title="Belum ada catatan penjualan kayu"
            subtitle="Tekan tombol + Jual Kayu untuk menghitung kubikasi otomatis dan membuat nota."
            action={
              <PrimaryButton
                title="+ Catat Jual Kayu"
                onPress={() => router.push('/sale/new')}
              />
            }
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topSection: {
    padding: 18,
    paddingBottom: 8,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    fontSize: TYPOGRAPHY.title,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
  },
  addBtn: {
    paddingHorizontal: 16,
  },
  searchBox: {
    minHeight: SIZING.inputMinHeight,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZING.radiusPill,
    paddingHorizontal: 16,
    gap: 10,
    ...SHADOWS.card,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
    paddingVertical: 8,
  },
  listContent: {
    padding: 18,
    paddingTop: 6,
    gap: 12,
    paddingBottom: 104,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZING.radiusXl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    gap: 12,
    ...SHADOWS.card,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardMain: {
    flex: 1,
    gap: 2,
  },
  customerName: {
    fontSize: TYPOGRAPHY.subhead,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
  },
  metaText: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.semiBold,
    color: COLORS.textMuted,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceSubtle,
    paddingTop: 10,
  },
  volumeLabel: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  totalAmount: {
    fontSize: TYPOGRAPHY.amountMd,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  remainingBox: {
    alignItems: 'flex-end',
  },
  remainingLabel: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.red,
  },
  remainingAmount: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.extraBold,
    color: COLORS.red,
    fontVariant: ['tabular-nums'],
  },
});
