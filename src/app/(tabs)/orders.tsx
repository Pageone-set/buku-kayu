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
import { BadgeTone, StatusBadge } from '../../components/ui/StatusBadge';
import { listFurnitureOrders } from '../../db/ordersRepo';
import { useAppStore } from '../../store/useAppStore';
import {
  COLORS,
  FONTS,
  SHADOWS,
  SIZING,
  TYPOGRAPHY,
  getFloatingTabBarClearance,
} from '../../theme/tokens';
import {
  FURNITURE_STATUS_LABELS,
  FurnitureOrder,
  FurnitureOrderStatus,
} from '../../types/domain';
import {
  calculateFurnitureNetEstimate,
  calculateRemainingAmount,
} from '../../utils/cubicCalculator';
import { formatDateIndo, formatRupiah } from '../../utils/formatters';

type OrderFilter = 'ACTIVE' | 'ALL' | FurnitureOrderStatus;

const FILTER_OPTIONS: readonly { label: string; value: OrderFilter }[] = [
  { label: 'Sedang Jalan', value: 'ACTIVE' },
  { label: 'Baru Pesan', value: 'ORDERED' },
  { label: 'Potong & Rakit', value: 'ASSEMBLY' },
  { label: 'Finishing', value: 'FINISHING' },
  { label: 'Siap Kirim', value: 'READY' },
  { label: 'Selesai', value: 'COMPLETED' },
  { label: 'Semua', value: 'ALL' },
];

function statusTone(status: FurnitureOrderStatus): BadgeTone {
  switch (status) {
    case 'ORDERED':
      return 'neutral';
    case 'ASSEMBLY':
      return 'amber';
    case 'FINISHING':
      return 'blue';
    case 'READY':
    case 'COMPLETED':
      return 'green';
  }
}

export default function OrdersListScreen() {
  const insets = useSafeAreaInsets();
  const dbRevision = useAppStore((s) => s.dbRevision);
  const [filter, setFilter] = useState<OrderFilter>('ACTIVE');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<FurnitureOrder[]>([]);

  const loadOrders = useCallback(async () => {
    try {
      const rows = await listFurnitureOrders(filter, search);
      setOrders(rows);
    } catch {
      // ignore transient error
    }
  }, [filter, search]);

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
    }, [loadOrders])
  );

  useEffect(() => {
    void loadOrders();
  }, [dbRevision, loadOrders]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topSection}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Orderan Furniture</Text>
          <PrimaryButton
            title="+ Order Baru"
            variant="ocean"
            onPress={() => router.push('/order/new')}
            style={styles.addBtn}
          />
        </View>

        <View style={styles.searchBox}>
          <Feather name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Cari pelanggan, barang, atau kode order..."
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
        data={orders}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: getFloatingTabBarClearance(insets.bottom) },
        ]}
        renderItem={({ item }) => {
          const remaining = calculateRemainingAmount(
            item.total_price,
            item.paid_amount
          );
          const netEstimate = calculateFurnitureNetEstimate(
            item.total_price,
            item.production_cost
          );

          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push(`/order/${item.id}`)}
              style={styles.card}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.orderCode}>
                    {item.order_code} • Perkiraan {formatDateIndo(item.deadline_date)}
                  </Text>
                  <Text style={styles.itemName}>{item.item_name}</Text>
                  <Text style={styles.customerName}>{item.customer_name}</Text>
                </View>
                <StatusBadge
                  label={FURNITURE_STATUS_LABELS[item.status]}
                  tone={statusTone(item.status)}
                />
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricCol}>
                  <Text style={styles.metricLabel}>Harga Jual</Text>
                  <Text style={styles.metricValue}>
                    {formatRupiah(item.total_price)}
                  </Text>
                </View>
                <View style={styles.metricCol}>
                  <Text style={styles.metricLabel}>
                    {remaining > 0 ? 'Sisa Tagihan' : 'Pembayaran'}
                  </Text>
                  <Text
                    style={[
                      styles.metricValue,
                      { color: remaining > 0 ? COLORS.red : COLORS.green },
                    ]}
                  >
                    {remaining > 0 ? formatRupiah(remaining) : 'Lunas'}
                  </Text>
                </View>
                <View style={styles.metricCol}>
                  <Text style={styles.metricLabel}>Perkiraan Untung</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      { color: netEstimate >= 0 ? COLORS.green : COLORS.red },
                    ]}
                  >
                    {formatRupiah(netEstimate)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon={<Feather name="layers" size={32} color={COLORS.textMuted} />}
            title="Belum ada orderan furniture"
            subtitle="Catat pesanan kusen, pintu, lemari, atau meja custom beserta DP dan biaya pengerjaannya."
            action={
              <PrimaryButton
                title="+ Catat Order Furniture"
                variant="ocean"
                onPress={() => router.push('/order/new')}
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
  orderCode: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.ocean,
  },
  itemName: {
    fontSize: TYPOGRAPHY.subhead,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
  },
  customerName: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontFamily: FONTS.semiBold,
  },
  metricsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceSubtle,
    paddingTop: 10,
    gap: 8,
  },
  metricCol: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.textMuted,
  },
  metricValue: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
