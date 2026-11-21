import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackupStatusBanner } from '../../components/domain/BackupStatusBanner';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { getDashboardSummary } from '../../db/cashFlowRepo';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, SHADOWS, SIZING, TYPOGRAPHY } from '../../theme/tokens';
import { DashboardSummary } from '../../types/domain';
import { formatDateIndo, formatRupiah, getTodayDatePrefix } from '../../utils/formatters';

const INITIAL_SUMMARY: DashboardSummary = {
  todayIn: 0,
  todayOut: 0,
  totalUnpaidWoodSales: 0,
  totalUnpaidFurniture: 0,
  totalUnpaidAll: 0,
  activeFurnitureOrdersCount: 0,
  lowStockCount: 0,
};

export default function DashboardScreen() {
  const workshopName = useAppStore((s) => s.workshopName);
  const dbRevision = useAppStore((s) => s.dbRevision);
  const [summary, setSummary] = useState<DashboardSummary>(INITIAL_SUMMARY);
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch {
      // Tetap tampilkan data terakhir bila load gagal sesaat
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSummary();
    }, [loadSummary])
  );

  useEffect(() => {
    void loadSummary();
  }, [dbRevision, loadSummary]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSummary();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.appLabel}>BukuKayu • {formatDateIndo(getTodayDatePrefix())}</Text>
            <Text style={styles.workshopTitle} numberOfLines={1}>
              {workshopName}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/settings/backup')}
            style={styles.settingsBtn}
            accessibilityLabel="Pengaturan dan Cadangkan Data"
          >
            <MaterialCommunityIcons
              name="cog-outline"
              size={26}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.actionGroup}>
          <PrimaryButton
            title="+ Catat Jual Kayu"
            size="lg"
            variant="primary"
            onPress={() => router.push('/sale/new')}
            icon={
              <MaterialCommunityIcons
                name="calculator-variant"
                size={24}
                color={COLORS.textOnDark}
              />
            }
          />
          <PrimaryButton
            title="+ Catat Order Furniture"
            size="lg"
            variant="success"
            onPress={() => router.push('/order/new')}
            icon={
              <MaterialCommunityIcons
                name="sofa-outline"
                size={24}
                color={COLORS.textOnDark}
              />
            }
          />
        </View>

        <Text style={styles.sectionHeading}>Ringkasan Hari Ini</Text>

        <View style={styles.twoColRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/cashflow')}
            style={[styles.metricCard, styles.metricIn]}
          >
            <View style={styles.metricLabelRow}>
              <MaterialCommunityIcons
                name="arrow-down-circle"
                size={20}
                color={COLORS.green}
              />
              <Text style={[styles.metricLabel, { color: COLORS.green }]}>
                Uang Masuk
              </Text>
            </View>
            <Text style={[styles.metricValue, { color: COLORS.green }]}>
              {formatRupiah(summary.todayIn)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/cashflow')}
            style={[styles.metricCard, styles.metricOut]}
          >
            <View style={styles.metricLabelRow}>
              <MaterialCommunityIcons
                name="arrow-up-circle"
                size={20}
                color={COLORS.red}
              />
              <Text style={[styles.metricLabel, { color: COLORS.red }]}>
                Uang Keluar
              </Text>
            </View>
            <Text style={[styles.metricValue, { color: COLORS.red }]}>
              {formatRupiah(summary.todayOut)}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/sales')}
          style={styles.kasbonCard}
        >
          <View style={styles.kasbonTop}>
            <View style={styles.metricLabelRow}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={22}
                color={COLORS.red}
              />
              <Text style={styles.kasbonTitle}>
                Kasbon / Kurang Bayar Belum Lunas
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={COLORS.red}
            />
          </View>
          <Text style={styles.kasbonAmount}>
            {formatRupiah(summary.totalUnpaidAll)}
          </Text>
          <Text style={styles.kasbonBreakdown}>
            Jual Kayu: {formatRupiah(summary.totalUnpaidWoodSales)} • Orderan:{' '}
            {formatRupiah(summary.totalUnpaidFurniture)}
          </Text>
        </TouchableOpacity>

        <View style={styles.twoColRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/orders')}
            style={styles.statusPillCard}
          >
            <Text style={styles.statusCount}>
              {summary.activeFurnitureOrdersCount}
            </Text>
            <Text style={styles.statusText}>Orderan Sedang Dikerjakan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/stock')}
            style={styles.statusPillCard}
          >
            <Text
              style={[
                styles.statusCount,
                summary.lowStockCount > 0 && { color: COLORS.amberDark },
              ]}
            >
              {summary.lowStockCount}
            </Text>
            <Text style={styles.statusText}>Ukuran Stok Menipis (&le;5 btg)</Text>
          </TouchableOpacity>
        </View>

        <BackupStatusBanner />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    padding: SIZING.spacingMd,
    gap: 14,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  appLabel: {
    fontSize: TYPOGRAPHY.label,
    fontWeight: '700',
    color: COLORS.amberDark,
  },
  workshopTitle: {
    fontSize: TYPOGRAPHY.title,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  settingsBtn: {
    width: 52,
    height: 52,
    borderRadius: SIZING.radiusMd,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  actionGroup: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: TYPOGRAPHY.subhead,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: SIZING.radiusLg,
    borderWidth: 1.5,
    padding: 14,
    gap: 6,
    ...SHADOWS.card,
  },
  metricIn: {
    backgroundColor: COLORS.greenLight,
    borderColor: COLORS.greenBorder,
  },
  metricOut: {
    backgroundColor: COLORS.redLight,
    borderColor: COLORS.redBorder,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricLabel: {
    fontSize: TYPOGRAPHY.label,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: TYPOGRAPHY.amountMd,
    fontWeight: '800',
  },
  kasbonCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZING.radiusLg,
    borderWidth: 1.5,
    borderColor: COLORS.redBorder,
    padding: SIZING.spacingMd,
    gap: 6,
    ...SHADOWS.card,
  },
  kasbonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kasbonTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.red,
  },
  kasbonAmount: {
    fontSize: TYPOGRAPHY.amountLg,
    fontWeight: '800',
    color: COLORS.red,
  },
  kasbonBreakdown: {
    fontSize: TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  statusPillCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: SIZING.radiusLg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 4,
    ...SHADOWS.card,
  },
  statusCount: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statusText: {
    fontSize: TYPOGRAPHY.label,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
