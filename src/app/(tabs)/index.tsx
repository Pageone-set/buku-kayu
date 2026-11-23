import { Feather } from '@expo/vector-icons';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackupStatusBanner } from '../../components/domain/BackupStatusBanner';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { getDashboardSummary } from '../../db/cashFlowRepo';
import { useAppStore } from '../../store/useAppStore';
import {
  COLORS,
  FONTS,
  SHADOWS,
  SIZING,
  TYPOGRAPHY,
  getFloatingTabBarClearance,
} from '../../theme/tokens';
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
  const insets = useSafeAreaInsets();
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
        contentContainerStyle={[
          styles.container,
          { paddingBottom: getFloatingTabBarClearance(insets.bottom) },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greetingText}>
              Halo, Bos Bengkel • {formatDateIndo(getTodayDatePrefix())}
            </Text>
            <Text style={styles.workshopTitle} numberOfLines={1}>
              {workshopName}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => router.push('/settings/backup')}
            style={styles.settingsBtn}
            accessibilityLabel="Pengaturan dan Cadangkan Data"
          >
            <Feather name="settings" size={20} color={COLORS.charcoal} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroKicker}>Ringkasan Kas Hari Ini</Text>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => router.push('/(tabs)/cashflow')}
              style={styles.heroPillLink}
            >
              <Text style={styles.heroPillText}>Buku Kas</Text>
              <Feather name="arrow-right" size={13} color={COLORS.textOnDark} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroMetricsRow}>
            <View style={styles.heroMetricCol}>
              <Text style={styles.heroMetricLabel}>Uang Masuk</Text>
              <Text style={styles.heroMetricAmount}>
                {formatRupiah(summary.todayIn)}
              </Text>
            </View>
            <View style={styles.heroVerticalDivider} />
            <View style={styles.heroMetricCol}>
              <Text style={styles.heroMetricLabel}>Uang Keluar</Text>
              <Text style={styles.heroMetricAmount}>
                {formatRupiah(summary.todayOut)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionGroup}>
          <PrimaryButton
            title="+ Catat Jual Kayu"
            size="lg"
            variant="primary"
            onPress={() => router.push('/sale/new')}
            icon={
              <Feather name="plus-circle" size={20} color={COLORS.textOnDark} />
            }
          />
          <PrimaryButton
            title="+ Catat Order Furniture"
            size="lg"
            variant="ocean"
            onPress={() => router.push('/order/new')}
            icon={<Feather name="layers" size={20} color={COLORS.textOnDark} />}
          />
          <View style={styles.offlineReassurance}>
            <Feather name="shield" size={14} color={COLORS.green} />
            <Text style={styles.offlineReassuranceText}>
              Tersimpan otomatis 100% offline di HP Anda
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/sales')}
          style={styles.kasbonCard}
        >
          <View style={styles.kasbonTop}>
            <View style={styles.metricLabelRow}>
              <View style={styles.kasbonIconWell}>
                <Feather name="alert-circle" size={18} color={COLORS.red} />
              </View>
              <Text style={styles.kasbonTitle}>
                Kasbon / Kurang Bayar Belum Lunas
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
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
            <View style={styles.statusIconWell}>
              <Feather name="layers" size={18} color={COLORS.ocean} />
            </View>
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
            <View
              style={[
                styles.statusIconWell,
                {
                  backgroundColor:
                    summary.lowStockCount > 0 ? COLORS.redLight : COLORS.greenLight,
                },
              ]}
            >
              <Feather
                name="box"
                size={18}
                color={summary.lowStockCount > 0 ? COLORS.red : COLORS.green}
              />
            </View>
            <Text
              style={[
                styles.statusCount,
                summary.lowStockCount > 0 && { color: COLORS.red },
              ]}
            >
              {summary.lowStockCount}
            </Text>
            <Text style={styles.statusText}>Ukuran Stok Menipis (&le;5 btg)</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/settings/wood-presets')}
          style={styles.menuCard}
        >
          <View style={styles.menuIconWell}>
            <Feather name="sliders" size={20} color={COLORS.ocean} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.menuTitle}>Jenis Kayu, Harga Pasar &amp; Ukuran</Text>
            <Text style={styles.menuSub}>
              Atur jenis kayu, ubah harga pasar/m³, &amp; ukuran standar
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/settings/suppliers')}
          style={styles.menuCard}
        >
          <View style={[styles.menuIconWell, { backgroundColor: COLORS.navyLight }]}>
            <Feather name="map-pin" size={20} color={COLORS.navy} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.menuTitle}>Asal &amp; Pemasok Kayu</Text>
            <Text style={styles.menuSub}>
              Catat dapat kayu dari mana, harga beli/m³, &amp; jenis kayunya
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

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
    padding: 18,
    gap: 16,
    paddingBottom: 104,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  greetingText: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  workshopTitle: {
    fontSize: TYPOGRAPHY.hero,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
  },
  settingsBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  heroCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 24,
    padding: 20,
    gap: 14,
    ...SHADOWS.floating,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroKicker: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.semiBold,
    color: '#BFDBFE',
  },
  heroPillLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SIZING.radiusPill,
    backgroundColor: COLORS.ocean,
  },
  heroPillText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.textOnDark,
  },
  heroMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroMetricCol: {
    flex: 1,
    gap: 4,
  },
  heroMetricLabel: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.medium,
    color: '#CBE1F8',
  },
  heroMetricAmount: {
    fontSize: TYPOGRAPHY.amountMd,
    fontFamily: FONTS.extraBold,
    color: COLORS.textOnDark,
    fontVariant: ['tabular-nums'],
  },
  heroVerticalDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  actionGroup: {
    gap: 10,
  },
  offlineReassurance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 2,
  },
  offlineReassuranceText: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  kasbonIconWell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.redLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kasbonCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZING.radiusXl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
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
    fontFamily: FONTS.bold,
    color: COLORS.red,
  },
  kasbonAmount: {
    fontSize: TYPOGRAPHY.amountLg,
    fontFamily: FONTS.extraBold,
    color: COLORS.red,
    fontVariant: ['tabular-nums'],
  },
  kasbonBreakdown: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  statusPillCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: SIZING.radiusXl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 6,
    ...SHADOWS.card,
  },
  statusIconWell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.oceanLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCount: {
    fontSize: 24,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statusText: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZING.radiusXl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.card,
  },
  menuIconWell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.oceanLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  menuSub: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
});
