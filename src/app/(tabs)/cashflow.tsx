import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipSelector } from '../../components/ui/ChipSelector';
import { EmptyState } from '../../components/ui/EmptyState';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  CashFlowPeriod,
  addManualCashFlow,
  listCashFlows,
} from '../../db/cashFlowRepo';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, SHADOWS, SIZING, TYPOGRAPHY } from '../../theme/tokens';
import {
  CASH_FLOW_CATEGORY_LABELS,
  CashFlow,
  CashFlowCategory,
  CashFlowSummary,
  CashFlowType,
} from '../../types/domain';
import { formatDateTimeIndo, formatRupiah } from '../../utils/formatters';

const PERIOD_OPTIONS: readonly { label: string; value: CashFlowPeriod }[] = [
  { label: 'Hari Ini', value: 'TODAY' },
  { label: '7 Hari', value: 'WEEK' },
  { label: 'Bulan Ini', value: 'MONTH' },
  { label: 'Semua', value: 'ALL' },
];

const TYPE_OPTIONS: readonly { label: string; value: 'ALL' | CashFlowType }[] = [
  { label: 'Semua', value: 'ALL' },
  { label: 'Uang Masuk', value: 'IN' },
  { label: 'Uang Keluar', value: 'OUT' },
];

const OUT_CATEGORY_OPTIONS: readonly { label: string; value: CashFlowCategory }[] = [
  { label: 'Beli Kayu / Bahan', value: 'MATERIAL_BUY' },
  { label: 'Bayar Tukang', value: 'LABOR_WAGE' },
  { label: 'Keperluan Bengkel', value: 'OPERATIONAL' },
  { label: 'Ambil Pribadi (Prive)', value: 'PERSONAL_DRAW' },
];

const IN_CATEGORY_OPTIONS: readonly { label: string; value: CashFlowCategory }[] = [
  { label: 'Jual Kayu', value: 'WOOD_SALE' },
  { label: 'Bayar Orderan Furniture', value: 'FURNITURE_PAYMENT' },
];

const INITIAL_SUMMARY: CashFlowSummary = {
  totalIn: 0,
  businessOut: 0,
  personalDrawOut: 0,
  totalOut: 0,
  businessNet: 0,
  cashBalance: 0,
};

export default function CashFlowScreen() {
  const dbRevision = useAppStore((s) => s.dbRevision);
  const bumpDbRevision = useAppStore((s) => s.bumpDbRevision);

  const [period, setPeriod] = useState<CashFlowPeriod>('TODAY');
  const [typeFilter, setTypeFilter] = useState<'ALL' | CashFlowType>('ALL');
  const [rows, setRows] = useState<CashFlow[]>([]);
  const [summary, setSummary] = useState<CashFlowSummary>(INITIAL_SUMMARY);

  const [modalOpen, setModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<CashFlowType>('OUT');
  const [entryCategory, setEntryCategory] =
    useState<CashFlowCategory>('OPERATIONAL');
  const [entryAmount, setEntryAmount] = useState(0);
  const [entryDesc, setEntryDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCashFlows = useCallback(async () => {
    try {
      const result = await listCashFlows({
        period,
        type: typeFilter,
      });
      setRows(result.rows);
      setSummary(result.summary);
    } catch {
      // ignore
    }
  }, [period, typeFilter]);

  useFocusEffect(
    useCallback(() => {
      void loadCashFlows();
    }, [loadCashFlows])
  );

  useEffect(() => {
    void loadCashFlows();
  }, [dbRevision, loadCashFlows]);

  const openNewEntryModal = () => {
    setEntryType('OUT');
    setEntryCategory('OPERATIONAL');
    setEntryAmount(0);
    setEntryDesc('');
    setModalOpen(true);
  };

  const handleSaveEntry = async () => {
    setSubmitting(true);
    try {
      await addManualCashFlow({
        type: entryType,
        category: entryCategory,
        amount: entryAmount,
        description: entryDesc,
      });
      setModalOpen(false);
      bumpDbRevision(true);
      await loadCashFlows();
    } catch (error) {
      Alert.alert(
        'Gagal Simpan Catatan Kas',
        error instanceof Error ? error.message : 'Periksa nominal dan keterangan.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topSection}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Buku Kas Harian</Text>
          <PrimaryButton
            title="+ Catat Kas"
            variant="danger"
            onPress={openNewEntryModal}
            style={styles.addBtn}
          />
        </View>

        <ChipSelector
          options={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
          scrollable
        />

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Uang Masuk</Text>
            <Text style={[styles.summaryVal, { color: COLORS.green }]}>
              +{formatRupiah(summary.totalIn)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pengeluaran Usaha</Text>
            <Text style={[styles.summaryVal, { color: COLORS.red }]}>
              -{formatRupiah(summary.businessOut)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { fontWeight: '800' }]}>
              Sisa Bersih Usaha
            </Text>
            <Text
              style={[
                styles.summaryVal,
                {
                  color: summary.businessNet >= 0 ? COLORS.green : COLORS.red,
                },
              ]}
            >
              {formatRupiah(summary.businessNet)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.priveLabel}>Ambil Pribadi (Prive)</Text>
            <Text style={styles.priveVal}>
              -{formatRupiah(summary.personalDrawOut)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { fontWeight: '800' }]}>
              Sisa Uang di Kas
            </Text>
            <Text style={styles.cashBalanceVal}>
              {formatRupiah(summary.cashBalance)}
            </Text>
          </View>
        </View>

        <ChipSelector
          options={TYPE_OPTIONS}
          value={typeFilter}
          onChange={setTypeFilter}
        />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isIn = item.type === 'IN';
          const isPrive = item.category === 'PERSONAL_DRAW';

          return (
            <View style={styles.entryCard}>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.entryBadges}>
                  <StatusBadge
                    label={CASH_FLOW_CATEGORY_LABELS[item.category]}
                    tone={isIn ? 'green' : isPrive ? 'amber' : 'red'}
                  />
                  {item.reference_id ? (
                    <Text style={styles.refText}>{item.reference_id}</Text>
                  ) : null}
                </View>
                <Text style={styles.entryDesc}>{item.description}</Text>
                <Text style={styles.entryTime}>
                  {formatDateTimeIndo(item.created_at)}
                </Text>
              </View>

              <Text
                style={[
                  styles.entryAmt,
                  { color: isIn ? COLORS.green : COLORS.red },
                ]}
              >
                {isIn ? '+' : '-'}
                {formatRupiah(item.amount)}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon={
              <MaterialCommunityIcons
                name="cash-multiple"
                size={44}
                color={COLORS.textMuted}
              />
            }
            title="Belum ada catatan uang masuk/keluar"
            subtitle="Semua penjualan kayu, pembayaran orderan, kulakan stok, upah tukang, dan ambil pribadi akan muncul di sini."
            action={
              <PrimaryButton
                title="+ Catat Uang Keluar / Prive"
                variant="primary"
                onPress={openNewEntryModal}
              />
            }
          />
        }
      />

      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Catat Arus Uang Harian</Text>

            <ChipSelector
              options={[
                { label: 'Uang Keluar', value: 'OUT' as CashFlowType },
                { label: 'Uang Masuk Lain', value: 'IN' as CashFlowType },
              ]}
              value={entryType}
              onChange={(t) => {
                setEntryType(t);
                setEntryCategory(t === 'OUT' ? 'OPERATIONAL' : 'WOOD_SALE');
              }}
            />

            <Text style={styles.fieldLabel}>Kategori</Text>
            <ChipSelector
              options={
                entryType === 'OUT' ? OUT_CATEGORY_OPTIONS : IN_CATEGORY_OPTIONS
              }
              value={entryCategory}
              onChange={setEntryCategory}
            />

            <MoneyInput
              label="Nominal *"
              value={entryAmount}
              onChangeValue={setEntryAmount}
            />

            <Text style={styles.fieldLabel}>Keterangan *</Text>
            <TextInput
              style={styles.textInput}
              value={entryDesc}
              onChangeText={setEntryDesc}
              placeholder={
                entryCategory === 'PERSONAL_DRAW'
                  ? 'Contoh: Keperluan rumah tangga'
                  : 'Contoh: Beli paku, lem kayu & amplas'
              }
              placeholderTextColor={COLORS.textMuted}
            />

            <View style={styles.modalActions}>
              <PrimaryButton
                title="Batal"
                variant="outline"
                onPress={() => setModalOpen(false)}
                disabled={submitting}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                title="Simpan"
                variant={entryType === 'IN' ? 'success' : 'primary'}
                loading={submitting}
                onPress={() => void handleSaveEntry()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZING.radiusLg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 6,
    ...SHADOWS.card,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.surfaceSubtle,
    marginVertical: 2,
  },
  priveLabel: {
    fontSize: TYPOGRAPHY.label,
    color: COLORS.amberDark,
    fontWeight: '700',
  },
  priveVal: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.amberDark,
    fontWeight: '800',
  },
  cashBalanceVal: {
    fontSize: TYPOGRAPHY.subhead,
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  listContent: {
    padding: SIZING.spacingMd,
    paddingTop: 6,
    gap: 10,
    paddingBottom: 28,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: SIZING.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
    ...SHADOWS.card,
  },
  entryBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  refText: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  entryDesc: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  entryTime: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  entryAmt: {
    fontSize: TYPOGRAPHY.subhead,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.heading,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.label,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  textInput: {
    minHeight: SIZING.inputMinHeight,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    borderRadius: SIZING.radiusMd,
    paddingHorizontal: 14,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
});
