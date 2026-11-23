import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChipSelector } from '../../components/ui/ChipSelector';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  CashFlowPeriod,
  addManualCashFlow,
  deleteCashFlow,
  getMonthlyCashFlowReport,
  listCashFlows,
} from '../../db/cashFlowRepo';
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
  CASH_FLOW_CATEGORY_LABELS,
  CashFlow,
  CashFlowCategory,
  CashFlowSummary,
  CashFlowType,
} from '../../types/domain';
import {
  formatDateTimeIndo,
  formatMonthYearIndo,
  formatRupiah,
} from '../../utils/formatters';
import {
  buildMonthlyCashFlowCsv,
  buildMonthlyCashFlowReportHtml,
} from '../../utils/receiptGenerator';
import { shareCsvFile, shareHtmlAsPdf } from '../../utils/shareReceipt';

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
  const insets = useSafeAreaInsets();
  const workshopName = useAppStore((s) => s.workshopName);
  const dbRevision = useAppStore((s) => s.dbRevision);
  const bumpDbRevision = useAppStore((s) => s.bumpDbRevision);

  const [period, setPeriod] = useState<CashFlowPeriod>('TODAY');
  const [typeFilter, setTypeFilter] = useState<'ALL' | CashFlowType>('ALL');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<CashFlow[]>([]);
  const [summary, setSummary] = useState<CashFlowSummary>(INITIAL_SUMMARY);

  const [modalOpen, setModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<CashFlowType>('OUT');
  const [entryCategory, setEntryCategory] =
    useState<CashFlowCategory>('OPERATIONAL');
  const [entryAmount, setEntryAmount] = useState(0);
  const [entryDesc, setEntryDesc] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CashFlow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nowDate = useMemo(() => new Date(), []);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportYear, setExportYear] = useState(nowDate.getFullYear());
  const [exportMonthIndex, setExportMonthIndex] = useState(nowDate.getMonth());
  const [exportPreviewCount, setExportPreviewCount] = useState(0);
  const [exportPreviewSummary, setExportPreviewSummary] =
    useState<CashFlowSummary>(INITIAL_SUMMARY);
  const [exportingKind, setExportingKind] = useState<'PDF' | 'CSV' | null>(
    null
  );

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

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return rows;
    }
    return rows.filter(
      (r) =>
        r.description.toLowerCase().includes(q) ||
        r.reference_id.toLowerCase().includes(q) ||
        CASH_FLOW_CATEGORY_LABELS[r.category].toLowerCase().includes(q)
    );
  }, [rows, search]);

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

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setSubmitting(true);
    try {
      await deleteCashFlow(deleteTarget.id);
      setDeleteTarget(null);
      bumpDbRevision(true);
      await loadCashFlows();
    } catch (error) {
      Alert.alert(
        'Gagal Menghapus',
        error instanceof Error ? error.message : 'Tidak bisa menghapus catatan ini.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const loadMonthlyPreview = useCallback(async () => {
    if (!exportModalOpen) {
      return;
    }
    try {
      const report = await getMonthlyCashFlowReport(
        exportYear,
        exportMonthIndex
      );
      setExportPreviewCount(report.rows.length);
      setExportPreviewSummary(report.summary);
    } catch {
      // ignore transient error
    }
  }, [exportModalOpen, exportMonthIndex, exportYear]);

  useEffect(() => {
    void loadMonthlyPreview();
  }, [loadMonthlyPreview]);

  const shiftExportMonth = (delta: number) => {
    const shifted = new Date(exportYear, exportMonthIndex + delta, 1);
    setExportYear(shifted.getFullYear());
    setExportMonthIndex(shifted.getMonth());
  };

  const handleExportMonthly = async (kind: 'PDF' | 'CSV') => {
    setExportingKind(kind);
    try {
      const report = await getMonthlyCashFlowReport(
        exportYear,
        exportMonthIndex
      );
      const exportData = {
        workshopName,
        year: exportYear,
        monthIndex: exportMonthIndex,
        rows: report.rows,
        summary: report.summary,
        categoryTotals: report.categoryTotals,
      };
      const periodLabel = formatMonthYearIndo(exportYear, exportMonthIndex);

      if (kind === 'PDF') {
        const html = buildMonthlyCashFlowReportHtml(exportData);
        await shareHtmlAsPdf(
          html,
          `Catatan Keuangan ${periodLabel}`,
          `BukuKayu_Keuangan_${periodLabel}`
        );
      } else {
        const csv = buildMonthlyCashFlowCsv(exportData);
        await shareCsvFile(
          csv,
          `BukuKayu_Keuangan_${periodLabel}.csv`,
          `Catatan Keuangan Excel/CSV ${periodLabel}`
        );
      }
    } catch (error) {
      Alert.alert(
        'Gagal Ekspor Catatan',
        error instanceof Error
          ? error.message
          : 'Terjadi kendala saat menyiapkan file laporan.'
      );
    } finally {
      setExportingKind(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topSection}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            Buku Kas
          </Text>
          <View style={styles.headerBtns}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setExportModalOpen(true)}
              style={styles.exportPillBtn}
              accessibilityLabel="Ekspor Catatan Keuangan Bulanan"
            >
              <Feather name="download" size={16} color={COLORS.navy} />
              <Text style={styles.exportPillText}>Ekspor</Text>
            </TouchableOpacity>
            <PrimaryButton
              title="+ Catat Kas"
              variant="primary"
              onPress={openNewEntryModal}
              style={styles.addBtn}
            />
          </View>
        </View>
      </View>

      <FlatList
        data={visibleRows}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.listHeader}>
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
                <Text
                  style={[styles.summaryLabel, { fontFamily: FONTS.extraBold }]}
                >
                  Sisa Bersih Usaha
                </Text>
                <Text
                  style={[
                    styles.summaryVal,
                    {
                      color:
                        summary.businessNet >= 0 ? COLORS.green : COLORS.red,
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
                <Text
                  style={[styles.summaryLabel, { fontFamily: FONTS.extraBold }]}
                >
                  Sisa Uang di Kas
                </Text>
                <Text style={styles.cashBalanceVal}>
                  {formatRupiah(summary.cashBalance)}
                </Text>
              </View>
            </View>

            <View style={styles.searchBox}>
              <Feather name="search" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Cari keterangan kas..."
                placeholderTextColor={COLORS.textMuted}
              />
              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Feather name="x" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <ChipSelector
              options={TYPE_OPTIONS}
              value={typeFilter}
              onChange={setTypeFilter}
              scrollable
            />
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: getFloatingTabBarClearance(insets.bottom) },
        ]}
        renderItem={({ item }) => {
          const isIn = item.type === 'IN';
          const isPrive = item.category === 'PERSONAL_DRAW';
          const isManual = !item.reference_id;

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

              <View style={styles.entryRight}>
                <Text
                  style={[
                    styles.entryAmt,
                    { color: isIn ? COLORS.green : COLORS.red },
                  ]}
                >
                  {isIn ? '+' : '-'}
                  {formatRupiah(item.amount)}
                </Text>
                {isManual ? (
                  <TouchableOpacity
                    onPress={() => setDeleteTarget(item)}
                    style={styles.deletePill}
                    accessibilityLabel="Hapus catatan kas"
                  >
                    <Feather name="trash-2" size={15} color={COLORS.red} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon={
              <Feather name="credit-card" size={32} color={COLORS.textMuted} />
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
          <View
            style={[
              styles.modalSheet,
              { paddingBottom: Math.max(insets.bottom, 16) + 16 },
            ]}
          >
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

      <ConfirmModal
        visible={deleteTarget !== null}
        title="Hapus Catatan Kas Ini?"
        message={
          deleteTarget
            ? `Catatan "${deleteTarget.description}" (${formatRupiah(
                deleteTarget.amount
              )}) akan dihapus permanen.`
            : ''
        }
        confirmLabel="Ya, Hapus"
        danger
        loading={submitting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <Modal
        visible={exportModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setExportModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              { paddingBottom: Math.max(insets.bottom, 16) + 16 },
            ]}
          >
            <Text style={styles.modalTitle}>
              Ekspor Catatan Keuangan Bulanan
            </Text>

            <View style={styles.monthPickerRow}>
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => shiftExportMonth(-1)}
                style={styles.monthArrowBtn}
                accessibilityLabel="Bulan sebelumnya"
              >
                <Feather name="chevron-left" size={20} color={COLORS.navy} />
              </TouchableOpacity>
              <Text style={styles.monthPickerTitle}>
                {formatMonthYearIndo(exportYear, exportMonthIndex)}
              </Text>
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => shiftExportMonth(1)}
                style={styles.monthArrowBtn}
                accessibilityLabel="Bulan berikutnya"
              >
                <Feather name="chevron-right" size={20} color={COLORS.navy} />
              </TouchableOpacity>
            </View>

            <View style={styles.monthShortcutRow}>
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => {
                  const now = new Date();
                  setExportYear(now.getFullYear());
                  setExportMonthIndex(now.getMonth());
                }}
                style={styles.monthShortcutChip}
              >
                <Text style={styles.monthShortcutText}>Bulan Ini</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => {
                  const now = new Date();
                  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  setExportYear(prev.getFullYear());
                  setExportMonthIndex(prev.getMonth());
                }}
                style={styles.monthShortcutChip}
              >
                <Text style={styles.monthShortcutText}>Bulan Lalu</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.exportPreviewBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Jumlah Catatan</Text>
                <Text style={styles.exportCountVal}>
                  {exportPreviewCount} transaksi
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Uang Masuk</Text>
                <Text style={[styles.summaryVal, { color: COLORS.green }]}>
                  +{formatRupiah(exportPreviewSummary.totalIn)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Pengeluaran Usaha</Text>
                <Text style={[styles.summaryVal, { color: COLORS.red }]}>
                  -{formatRupiah(exportPreviewSummary.businessOut)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.priveLabel}>Ambil Pribadi (Prive)</Text>
                <Text style={styles.priveVal}>
                  -{formatRupiah(exportPreviewSummary.personalDrawOut)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text
                  style={[styles.summaryLabel, { fontFamily: FONTS.extraBold }]}
                >
                  Sisa Uang di Kas
                </Text>
                <Text style={styles.cashBalanceVal}>
                  {formatRupiah(exportPreviewSummary.cashBalance)}
                </Text>
              </View>
            </View>

            <PrimaryButton
              title="Ekspor Laporan PDF (Cetak / WA)"
              variant="primary"
              loading={exportingKind === 'PDF'}
              disabled={exportingKind !== null}
              onPress={() => void handleExportMonthly('PDF')}
              icon={
                <Feather name="file-text" size={18} color={COLORS.textOnDark} />
              }
            />

            <PrimaryButton
              title="Ekspor File Excel / CSV (.csv)"
              variant="ocean"
              loading={exportingKind === 'CSV'}
              disabled={exportingKind !== null}
              onPress={() => void handleExportMonthly('CSV')}
              icon={
                <Feather name="download" size={18} color={COLORS.textOnDark} />
              }
            />

            <PrimaryButton
              title="Tutup"
              variant="outline"
              disabled={exportingKind !== null}
              onPress={() => setExportModalOpen(false)}
            />
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
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
  },
  listHeader: {
    gap: 12,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportPillBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: SIZING.radiusPill,
    backgroundColor: COLORS.navyLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exportPillText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.navy,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
  },
  addBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZING.radiusXl,
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
    fontFamily: FONTS.semiBold,
  },
  summaryVal: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.extraBold,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.surfaceSubtle,
    marginVertical: 2,
  },
  priveLabel: {
    fontSize: TYPOGRAPHY.label,
    color: COLORS.ocean,
    fontFamily: FONTS.bold,
  },
  priveVal: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.ocean,
    fontFamily: FONTS.extraBold,
    fontVariant: ['tabular-nums'],
  },
  cashBalanceVal: {
    fontSize: TYPOGRAPHY.subhead,
    color: COLORS.navy,
    fontFamily: FONTS.extraBold,
    fontVariant: ['tabular-nums'],
  },
  searchBox: {
    minHeight: 48,
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
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
    paddingVertical: 6,
  },
  listContent: {
    padding: 18,
    paddingTop: 6,
    gap: 12,
    paddingBottom: 104,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: SIZING.radiusLg,
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
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
  },
  entryDesc: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  entryTime: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  entryRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  entryAmt: {
    fontSize: TYPOGRAPHY.subhead,
    fontFamily: FONTS.extraBold,
    fontVariant: ['tabular-nums'],
  },
  deletePill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.redLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.heading,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.bold,
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
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  monthPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  monthArrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthPickerTitle: {
    fontSize: TYPOGRAPHY.subhead,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
  },
  monthShortcutRow: {
    flexDirection: 'row',
    gap: 8,
  },
  monthShortcutChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: SIZING.radiusPill,
    backgroundColor: COLORS.oceanLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthShortcutText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.ocean,
  },
  exportPreviewBox: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SIZING.radiusMd,
    padding: 12,
    gap: 6,
  },
  exportCountVal: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.extraBold,
    color: COLORS.navy,
  },
});
