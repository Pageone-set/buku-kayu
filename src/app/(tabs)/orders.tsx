import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipSelector } from '../../components/ui/ChipSelector';
import { EmptyState } from '../../components/ui/EmptyState';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { BadgeTone, StatusBadge } from '../../components/ui/StatusBadge';
import { listFurnitureOrders } from '../../db/ordersRepo';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, SHADOWS, SIZING, TYPOGRAPHY } from '../../theme/tokens';
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
  const dbRevision = useAppStore((s) => s.dbRevision);
  const [filter, setFilter] = useState<OrderFilter>('ACTIVE');
  const [orders, setOrders] = useState<FurnitureOrder[]>([]);

  const loadOrders = useCallback(async () => {
    try {
      const rows = await listFurnitureOrders(filter);
      setOrders(rows);
    } catch {
      // ignore transient error
    }
  }, [filter]);

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
            variant="success"
            onPress={() => router.push('/order/new')}
            style={styles.addBtn}
          />
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
        contentContainerStyle={styles.listContent}
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
                    {item.order_code} • Target {formatDateIndo(item.deadline_date)}
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
            icon={
              <MaterialCommunityIcons
                name="hammer-wrench"
                size={44}
                color={COLORS.textMuted}
              />
            }
            title="Belum ada orderan furniture"
            subtitle="Catat pesanan kusen, pintu, lemari, atau meja custom beserta DP dan biaya pengerjaannya."
            action={
              <PrimaryButton
                title="+ Catat Order Furniture"
                variant="success"
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
    padding: SIZING.spacingMd,
    paddingBottom: 8,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    fontSize: TYPOGRAPHY.title,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  addBtn: {
    paddingHorizontal: 14,
  },
  listContent: {
    padding: SIZING.spacingMd,
    paddingTop: 6,
    gap: 10,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZING.radiusLg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZING.spacingMd,
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
    fontWeight: '700',
    color: COLORS.amberDark,
  },
  itemName: {
    fontSize: TYPOGRAPHY.subhead,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  customerName: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontWeight: '600',
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
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  metricValue: {
    fontSize: TYPOGRAPHY.label,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
});
