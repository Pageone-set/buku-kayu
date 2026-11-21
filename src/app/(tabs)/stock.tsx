import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipSelector } from '../../components/ui/ChipSelector';
import { EmptyState } from '../../components/ui/EmptyState';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { NumberStepper } from '../../components/ui/NumberStepper';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  addOrRestockWood,
  adjustWoodStock,
  listWoodStocks,
} from '../../db/stockRepo';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, SHADOWS, SIZING, TYPOGRAPHY } from '../../theme/tokens';
import {
  DIMENSION_PRESETS,
  LENGTH_PRESETS_CM,
  WOOD_TYPE_PRESETS,
  WoodStock,
} from '../../types/domain';
import { calculateVolumeM3 } from '../../utils/cubicCalculator';
import {
  formatDimension,
  formatRupiah,
  formatVolumeM3,
} from '../../utils/formatters';

const FILTER_TABS = [
  { label: 'Semua', value: 'Semua' },
  { label: 'Jati', value: 'Jati' },
  { label: 'Mahoni', value: 'Mahoni' },
  { label: 'Sengon', value: 'Sengon' },
  { label: 'Kamper', value: 'Kamper' },
  { label: 'Lainnya', value: 'Lainnya' },
] as const;

export default function StockScreen() {
  const dbRevision = useAppStore((s) => s.dbRevision);
  const bumpDbRevision = useAppStore((s) => s.bumpDbRevision);

  const [filter, setFilter] = useState<string>('Semua');
  const [stocks, setStocks] = useState<WoodStock[]>([]);

  const [newModalOpen, setNewModalOpen] = useState(false);
  const [woodType, setWoodType] = useState('Jati');
  const [lengthCm, setLengthCm] = useState('400');
  const [widthCm, setWidthCm] = useState('12');
  const [thicknessCm, setThicknessCm] = useState('6');
  const [stockQty, setStockQty] = useState(10);
  const [buyPriceM3, setBuyPriceM3] = useState(9000000);
  const [sellPriceM3, setSellPriceM3] = useState(11500000);
  const [recordCashOut, setRecordCashOut] = useState(true);

  const [adjustTarget, setAdjustTarget] = useState<WoodStock | null>(null);
  const [adjustMode, setAdjustMode] = useState<'ADD' | 'SUB'>('ADD');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustBuyPrice, setAdjustBuyPrice] = useState(0);
  const [adjustSellPrice, setAdjustSellPrice] = useState(0);
  const [adjustCashOut, setAdjustCashOut] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const loadStocks = useCallback(async () => {
    try {
      const rows = await listWoodStocks(filter);
      setStocks(rows);
    } catch {
      // ignore
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      void loadStocks();
    }, [loadStocks])
  );

  useEffect(() => {
    void loadStocks();
  }, [dbRevision, loadStocks]);

  const totals = useMemo(() => {
    let totalBatang = 0;
    let totalM3 = 0;
    for (const s of stocks) {
      totalBatang += s.stock_qty;
      totalM3 += calculateVolumeM3(
        s.length_cm,
        s.width_cm,
        s.thickness_cm,
        s.stock_qty
      );
    }
    return {
      totalBatang,
      totalM3: Math.round(totalM3 * 1_000_000) / 1_000_000,
    };
  }, [stocks]);

  const handleSaveNewStock = async () => {
    const l = Number.parseFloat(lengthCm) || 0;
    const w = Number.parseFloat(widthCm) || 0;
    const t = Number.parseFloat(thicknessCm) || 0;

    setSubmitting(true);
    try {
      await addOrRestockWood({
        woodType,
        lengthCm: l,
        widthCm: w,
        thicknessCm: t,
        stockQty,
        buyPriceM3,
        sellPriceM3,
        recordCashOut,
      });
      setNewModalOpen(false);
      bumpDbRevision(true);
      await loadStocks();
    } catch (error) {
      Alert.alert(
        'Gagal Simpan Stok',
        error instanceof Error ? error.message : 'Periksa data stok.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openAdjustModal = (stock: WoodStock, mode: 'ADD' | 'SUB') => {
    setAdjustTarget(stock);
    setAdjustMode(mode);
    setAdjustQty(1);
    setAdjustBuyPrice(stock.buy_price_m3);
    setAdjustSellPrice(stock.sell_price_m3);
    setAdjustCashOut(mode === 'ADD');
  };

  const handleSaveAdjust = async () => {
    if (!adjustTarget) {
      return;
    }
    const delta = adjustMode === 'ADD' ? adjustQty : -adjustQty;
    setSubmitting(true);
    try {
      await adjustWoodStock({
        id: adjustTarget.id,
        deltaQty: delta,
        buyPriceM3: adjustBuyPrice,
        sellPriceM3: adjustSellPrice,
        recordCashOut: adjustMode === 'ADD' ? adjustCashOut : false,
      });
      setAdjustTarget(null);
      bumpDbRevision(true);
      await loadStocks();
    } catch (error) {
      Alert.alert(
        'Gagal Ubah Stok',
        error instanceof Error ? error.message : 'Periksa jumlah penyesuaian.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topSection}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Stok Balok & Papan</Text>
          <PrimaryButton
            title="+ Kulakan"
            onPress={() => setNewModalOpen(true)}
            style={styles.addBtn}
          />
        </View>

        <View style={styles.summaryStrip}>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>Total Stok Ditampilkan</Text>
            <Text style={styles.summaryValue}>
              {totals.totalBatang} Batang • {formatVolumeM3(totals.totalM3)}
            </Text>
          </View>
        </View>

        <ChipSelector
          options={FILTER_TABS}
          value={filter}
          onChange={setFilter}
          scrollable
        />
      </View>

      <FlatList
        data={stocks}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const vol = calculateVolumeM3(
            item.length_cm,
            item.width_cm,
            item.thickness_cm,
            item.stock_qty
          );
          const isLow = item.stock_qty <= 5;

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.woodTitle}>{item.wood_type}</Text>
                  <Text style={styles.dimText}>
                    {formatDimension(
                      item.length_cm,
                      item.width_cm,
                      item.thickness_cm
                    )}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <StatusBadge
                    label={`${item.stock_qty} Batang`}
                    tone={isLow ? 'red' : 'green'}
                  />
                  <Text style={styles.volText}>{formatVolumeM3(vol)}</Text>
                </View>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceText}>
                  Beli: {formatRupiah(item.buy_price_m3)}/m³
                </Text>
                <Text style={styles.priceSellText}>
                  Jual: {formatRupiah(item.sell_price_m3)}/m³
                </Text>
              </View>

              <View style={styles.cardActions}>
                <PrimaryButton
                  title="+ Kulakan"
                  variant="primary"
                  onPress={() => openAdjustModal(item, 'ADD')}
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  title="Sesuaikan"
                  variant="outline"
                  onPress={() => openAdjustModal(item, 'SUB')}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon={
              <MaterialCommunityIcons
                name="pine-tree"
                size={44}
                color={COLORS.textMuted}
              />
            }
            title="Belum ada stok untuk jenis kayu ini"
            subtitle="Tambahkan stok balok atau papan baru agar mudah dipilih saat mencatat penjualan."
            action={
              <PrimaryButton
                title="+ Tambah Stok Baru"
                onPress={() => setNewModalOpen(true)}
              />
            }
          />
        }
      />

      <Modal
        visible={newModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setNewModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <ScrollView contentContainerStyle={{ gap: 10 }}>
              <Text style={styles.modalTitle}>Tambah Stok / Kulakan Baru</Text>

              <Text style={styles.fieldLabel}>Jenis Kayu</Text>
              <ChipSelector
                options={WOOD_TYPE_PRESETS.map((w) => ({ label: w, value: w }))}
                value={
                  WOOD_TYPE_PRESETS.includes(
                    woodType as (typeof WOOD_TYPE_PRESETS)[number]
                  )
                    ? woodType
                    : ''
                }
                onChange={setWoodType}
              />
              <TextInput
                style={styles.textInput}
                value={woodType}
                onChangeText={setWoodType}
                placeholder="Atau ketik jenis kayu lain..."
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.fieldLabel}>Ukuran Cepat (Tebal × Lebar cm)</Text>
              <ChipSelector
                options={DIMENSION_PRESETS.map((d) => ({
                  label: d.label,
                  value: `${d.thicknessCm}x${d.widthCm}`,
                }))}
                value={`${Number.parseFloat(thicknessCm) || 0}x${
                  Number.parseFloat(widthCm) || 0
                }`}
                onChange={(val) => {
                  const [t, w] = val.split('x');
                  setThicknessCm(t);
                  setWidthCm(w);
                }}
              />

              <Text style={styles.fieldLabel}>Panjang Cepat (cm)</Text>
              <ChipSelector
                options={LENGTH_PRESETS_CM.map((p) => ({
                  label: `${p} cm`,
                  value: p,
                }))}
                value={Number.parseFloat(lengthCm) || 0}
                onChange={(v) => setLengthCm(String(v))}
              />

              <View style={styles.dimRow}>
                <View style={styles.dimCol}>
                  <Text style={styles.dimLabel}>P (cm)</Text>
                  <TextInput
                    style={styles.dimInput}
                    value={lengthCm}
                    onChangeText={setLengthCm}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.dimCol}>
                  <Text style={styles.dimLabel}>L (cm)</Text>
                  <TextInput
                    style={styles.dimInput}
                    value={widthCm}
                    onChangeText={setWidthCm}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.dimCol}>
                  <Text style={styles.dimLabel}>T (cm)</Text>
                  <TextInput
                    style={styles.dimInput}
                    value={thicknessCm}
                    onChangeText={setThicknessCm}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <NumberStepper
                label="Jumlah Batang Masuk"
                value={stockQty}
                onChange={setStockQty}
                min={0}
              />

              <MoneyInput
                label="Harga Beli (Kulakan) per m³"
                value={buyPriceM3}
                onChangeValue={setBuyPriceM3}
              />

              <MoneyInput
                label="Harga Jual per m³"
                value={sellPriceM3}
                onChangeValue={setSellPriceM3}
              />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>
                    Catat pembelian di Uang Keluar Kas
                  </Text>
                </View>
                <Switch
                  value={recordCashOut}
                  onValueChange={setRecordCashOut}
                  trackColor={{ false: COLORS.border, true: COLORS.amberBorder }}
                  thumbColor={recordCashOut ? COLORS.amber : '#F4F4F5'}
                />
              </View>

              <View style={styles.modalActions}>
                <PrimaryButton
                  title="Batal"
                  variant="outline"
                  onPress={() => setNewModalOpen(false)}
                  disabled={submitting}
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  title="Simpan Stok"
                  variant="primary"
                  loading={submitting}
                  onPress={() => void handleSaveNewStock()}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={adjustTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setAdjustTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {adjustTarget ? (
              <View style={{ gap: 10 }}>
                <Text style={styles.modalTitle}>
                  {adjustMode === 'ADD' ? 'Kulakan Tambah Stok' : 'Sesuaikan Stok'}
                </Text>
                <Text style={styles.dimText}>
                  {adjustTarget.wood_type} •{' '}
                  {formatDimension(
                    adjustTarget.length_cm,
                    adjustTarget.width_cm,
                    adjustTarget.thickness_cm
                  )}{' '}
                  (Saat ini: {adjustTarget.stock_qty} btg)
                </Text>

                <ChipSelector
                  options={[
                    { label: '+ Tambah Stok', value: 'ADD' as const },
                    { label: '− Kurangi Stok', value: 'SUB' as const },
                  ]}
                  value={adjustMode}
                  onChange={(m) => {
                    setAdjustMode(m);
                    setAdjustCashOut(m === 'ADD');
                  }}
                />

                <NumberStepper
                  label={
                    adjustMode === 'ADD'
                      ? 'Jumlah Batang Masuk'
                      : 'Jumlah Batang Keluar / Rusak'
                  }
                  value={adjustQty}
                  onChange={setAdjustQty}
                  min={1}
                  max={
                    adjustMode === 'SUB'
                      ? Math.max(1, adjustTarget.stock_qty)
                      : 9999
                  }
                />

                <MoneyInput
                  label="Harga Beli per m³"
                  value={adjustBuyPrice}
                  onChangeValue={setAdjustBuyPrice}
                />

                <MoneyInput
                  label="Harga Jual per m³"
                  value={adjustSellPrice}
                  onChangeValue={setAdjustSellPrice}
                />

                {adjustMode === 'ADD' ? (
                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchLabel}>
                        Catat kulakan di Uang Keluar Kas
                      </Text>
                    </View>
                    <Switch
                      value={adjustCashOut}
                      onValueChange={setAdjustCashOut}
                      trackColor={{ false: COLORS.border, true: COLORS.amberBorder }}
                      thumbColor={adjustCashOut ? COLORS.amber : '#F4F4F5'}
                    />
                  </View>
                ) : null}

                <View style={styles.modalActions}>
                  <PrimaryButton
                    title="Batal"
                    variant="outline"
                    onPress={() => setAdjustTarget(null)}
                    disabled={submitting}
                    style={{ flex: 1 }}
                  />
                  <PrimaryButton
                    title="Simpan"
                    variant="success"
                    loading={submitting}
                    onPress={() => void handleSaveAdjust()}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : null}
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
  summaryStrip: {
    backgroundColor: COLORS.amberLight,
    borderWidth: 1,
    borderColor: COLORS.amberBorder,
    borderRadius: SIZING.radiusMd,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.amberDark,
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.subhead,
    fontWeight: '800',
    color: COLORS.textPrimary,
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
    gap: 10,
    ...SHADOWS.card,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  woodTitle: {
    fontSize: TYPOGRAPHY.heading,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  dimText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  volText: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SIZING.radiusSm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  priceText: {
    fontSize: TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  priceSellText: {
    fontSize: TYPOGRAPHY.label,
    color: COLORS.amberDark,
    fontWeight: '800',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '90%',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
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
  dimRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dimCol: {
    flex: 1,
    gap: 4,
  },
  dimLabel: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  dimInput: {
    minHeight: SIZING.inputMinHeight,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    borderRadius: SIZING.radiusMd,
    paddingHorizontal: 10,
    fontSize: TYPOGRAPHY.subhead,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surfaceSubtle,
    padding: 12,
    borderRadius: SIZING.radiusMd,
  },
  switchLabel: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
});
