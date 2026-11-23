import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
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
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChipSelector } from '../../components/ui/ChipSelector';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { DimensionSpecStrip } from '../../components/ui/DimensionSpecStrip';
import { EmptyState } from '../../components/ui/EmptyState';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { NumberStepper } from '../../components/ui/NumberStepper';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { WoodSwatchBadge } from '../../components/ui/WoodSwatchBadge';
import {
  addOrRestockWood,
  adjustWoodStock,
  deleteWoodStock,
  listWoodStocks,
} from '../../db/stockRepo';
import { listWoodSuppliers } from '../../db/suppliersRepo';
import { listWoodDimensions, listWoodTypes } from '../../db/woodPresetsRepo';
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
  LENGTH_PRESETS_CM,
  WoodDimensionPreset,
  WoodStock,
  WoodSupplierWithPrices,
  WoodTypePreset,
} from '../../types/domain';
import { calculateVolumeM3 } from '../../utils/cubicCalculator';
import {
  formatRupiah,
  formatVolumeM3,
} from '../../utils/formatters';
import { formatDimensionNumber } from '../../utils/woodPresetHelpers';

export default function StockScreen() {
  const insets = useSafeAreaInsets();
  const dbRevision = useAppStore((s) => s.dbRevision);
  const bumpDbRevision = useAppStore((s) => s.bumpDbRevision);

  const [filter, setFilter] = useState<string>('Semua');
  const [stocks, setStocks] = useState<WoodStock[]>([]);
  const [woodTypes, setWoodTypes] = useState<WoodTypePreset[]>([]);
  const [dimensions, setDimensions] = useState<WoodDimensionPreset[]>([]);
  const [suppliers, setSuppliers] = useState<WoodSupplierWithPrices[]>([]);

  const [newModalOpen, setNewModalOpen] = useState(false);
  const [woodType, setWoodType] = useState('Jati');
  const [lengthCm, setLengthCm] = useState('400');
  const [widthCm, setWidthCm] = useState('12');
  const [thicknessCm, setThicknessCm] = useState('6');
  const [stockQty, setStockQty] = useState(10);
  const [buyPriceM3, setBuyPriceM3] = useState(9000000);
  const [sellPriceM3, setSellPriceM3] = useState(11500000);
  const [supplierName, setSupplierName] = useState('');
  const [recordCashOut, setRecordCashOut] = useState(true);

  const [adjustTarget, setAdjustTarget] = useState<WoodStock | null>(null);
  const [adjustMode, setAdjustMode] = useState<'ADD' | 'SUB'>('ADD');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustBuyPrice, setAdjustBuyPrice] = useState(0);
  const [adjustSellPrice, setAdjustSellPrice] = useState(0);
  const [adjustCashOut, setAdjustCashOut] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const loadStocks = useCallback(async () => {
    try {
      const [rows, types, dims, supplierRows] = await Promise.all([
        listWoodStocks(filter),
        listWoodTypes(),
        listWoodDimensions(),
        listWoodSuppliers(),
      ]);
      setStocks(rows);
      setWoodTypes(types);
      setDimensions(dims);
      setSuppliers(supplierRows);
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

  const filterTabs = useMemo(() => {
    return [
      { label: 'Semua', value: 'Semua' },
      ...woodTypes.map((w) => ({ label: w.name, value: w.name })),
      { label: 'Lainnya', value: 'Lainnya' },
    ];
  }, [woodTypes]);

  useEffect(() => {
    if (
      woodTypes.length > 0 &&
      !filterTabs.some((t) => t.value === filter)
    ) {
      setFilter('Semua');
    }
  }, [filter, filterTabs, woodTypes.length]);

  const woodColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of woodTypes) {
      map.set(w.name.trim().toLowerCase(), w.color_hex);
    }
    return map;
  }, [woodTypes]);

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
        supplierName,
        recordCashOut,
      });
      setNewModalOpen(false);
      setSupplierName('');
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

  const handleDeleteStock = async () => {
    if (!adjustTarget) {
      return;
    }
    setSubmitting(true);
    try {
      await deleteWoodStock(adjustTarget.id);
      setDeleteConfirmOpen(false);
      setAdjustTarget(null);
      bumpDbRevision(true);
      await loadStocks();
    } catch (error) {
      Alert.alert(
        'Gagal Hapus Stok',
        error instanceof Error ? error.message : 'Tidak bisa menghapus stok ini.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topSection}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Stok Balok &amp; Papan</Text>
          <PrimaryButton
            title="+ Kulakan"
            onPress={() => setNewModalOpen(true)}
            style={styles.addBtn}
          />
        </View>

        <ChipSelector
          options={filterTabs}
          value={filter}
          onChange={setFilter}
          scrollable
        />
      </View>

      <FlatList
        data={stocks}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.summaryStrip}>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Total Stok Ditampilkan</Text>
                <Text style={styles.summaryValue}>
                  {totals.totalBatang} Batang • {formatVolumeM3(totals.totalM3)}
                </Text>
              </View>
            </View>

            <View style={styles.shortcutRow}>
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => router.push('/settings/wood-presets')}
                style={styles.presetShortcutBtn}
              >
                <Feather name="sliders" size={14} color={COLORS.navy} />
                <Text style={styles.presetShortcutText}>Harga &amp; Ukuran</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => router.push('/settings/suppliers')}
                style={styles.presetShortcutBtn}
              >
                <Feather name="map-pin" size={14} color={COLORS.ocean} />
                <Text style={[styles.presetShortcutText, { color: COLORS.ocean }]}>
                  Asal &amp; Pemasok Kayu
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: getFloatingTabBarClearance(insets.bottom) },
        ]}
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
                <View style={styles.woodIdentity}>
                  <WoodSwatchBadge
                    woodType={item.wood_type}
                    colorHex={woodColorMap.get(
                      item.wood_type.trim().toLowerCase()
                    )}
                    size={20}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.woodTitle}>{item.wood_type}</Text>
                    <Text style={styles.volText}>{formatVolumeM3(vol)}</Text>
                  </View>
                </View>
                <StatusBadge
                  label={`${item.stock_qty} Batang`}
                  tone={isLow ? 'red' : 'green'}
                />
              </View>

              <DimensionSpecStrip
                lengthCm={item.length_cm}
                widthCm={item.width_cm}
                thicknessCm={item.thickness_cm}
                compact
              />

              <View style={styles.priceRow}>
                <Text style={styles.priceText}>
                  Beli: {formatRupiah(item.buy_price_m3)}/m³
                </Text>
                <Text style={styles.priceSellText}>
                  Jual: {formatRupiah(item.sell_price_m3)}/m³
                </Text>
              </View>

              {item.last_supplier_name ? (
                <View style={styles.supplierTag}>
                  <Feather name="map-pin" size={12} color={COLORS.ocean} />
                  <Text style={styles.supplierTagText}>
                    Asal terakhir: {item.last_supplier_name}
                  </Text>
                </View>
              ) : null}

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
            icon={<Feather name="box" size={32} color={COLORS.textMuted} />}
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

              <View style={styles.modalLabelRow}>
                <Text style={styles.fieldLabel}>Jenis Kayu</Text>
                <TouchableOpacity
                  activeOpacity={0.78}
                  onPress={() => {
                    setNewModalOpen(false);
                    router.push('/settings/wood-presets?tab=wood');
                  }}
                >
                  <Text style={styles.modalManageLink}>Atur / + Tambah</Text>
                </TouchableOpacity>
              </View>
              <ChipSelector
                options={woodTypes.map((w) => ({ label: w.name, value: w.name }))}
                value={
                  woodTypes.find(
                    (w) => w.name.toLowerCase() === woodType.trim().toLowerCase()
                  )?.name ?? ''
                }
                onChange={(name) => {
                  setWoodType(name);
                  const found = woodTypes.find((w) => w.name === name);
                  if (found) {
                    if (found.default_buy_price_m3 > 0) {
                      setBuyPriceM3(found.default_buy_price_m3);
                    }
                    if (found.default_price_m3 > 0) {
                      setSellPriceM3(found.default_price_m3);
                    }
                  }
                }}
                scrollable
              />
              <TextInput
                style={styles.textInput}
                value={woodType}
                onChangeText={setWoodType}
                placeholder="Atau ketik jenis kayu lain..."
                placeholderTextColor={COLORS.textMuted}
              />

              <View style={styles.modalLabelRow}>
                <Text style={styles.fieldLabel}>
                  Dapat Kayu Dari Mana (Opsional)
                </Text>
                <TouchableOpacity
                  activeOpacity={0.78}
                  onPress={() => {
                    setNewModalOpen(false);
                    router.push('/settings/suppliers');
                  }}
                >
                  <Text style={styles.modalManageLink}>Atur Pemasok</Text>
                </TouchableOpacity>
              </View>
              {suppliers.length > 0 ? (
                <ChipSelector
                  options={suppliers.map((s) => ({
                    label: s.supplier_name,
                    value: s.supplier_name,
                  }))}
                  value={supplierName}
                  onChange={(name) => {
                    setSupplierName(name);
                    const pickedSupplier = suppliers.find(
                      (s) => s.supplier_name === name
                    );
                    const matchedWood = pickedSupplier?.items.find(
                      (it) =>
                        it.wood_type.trim().toLowerCase() ===
                        woodType.trim().toLowerCase()
                    );
                    if (matchedWood && matchedWood.buy_price_m3 > 0) {
                      setBuyPriceM3(matchedWood.buy_price_m3);
                    }
                  }}
                  scrollable
                />
              ) : null}
              <TextInput
                style={styles.textInput}
                value={supplierName}
                onChangeText={setSupplierName}
                placeholder="Ketik nama pemasok / sawmill / asal kayu..."
                placeholderTextColor={COLORS.textMuted}
              />

              <View style={styles.modalLabelRow}>
                <Text style={styles.fieldLabel}>
                  Ukuran Cepat (Tebal × Lebar cm)
                </Text>
                <TouchableOpacity
                  activeOpacity={0.78}
                  onPress={() => {
                    setNewModalOpen(false);
                    router.push('/settings/wood-presets?tab=size');
                  }}
                >
                  <Text style={styles.modalManageLink}>Atur Ukuran</Text>
                </TouchableOpacity>
              </View>
              <ChipSelector
                options={dimensions.map((d) => ({
                  label: d.label,
                  value: `${formatDimensionNumber(d.thickness_cm)}x${formatDimensionNumber(
                    d.width_cm
                  )}x${formatDimensionNumber(d.default_length_cm)}`,
                }))}
                value={`${formatDimensionNumber(
                  Number.parseFloat(thicknessCm) || 0
                )}x${formatDimensionNumber(
                  Number.parseFloat(widthCm) || 0
                )}x${formatDimensionNumber(Number.parseFloat(lengthCm) || 0)}`}
                onChange={(val) => {
                  const [t, w, l] = val.split('x');
                  setThicknessCm(t);
                  setWidthCm(w);
                  if (l) {
                    setLengthCm(l);
                  }
                }}
                scrollable
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
                  trackColor={{ false: COLORS.border, true: COLORS.oceanBorder }}
                  thumbColor={recordCashOut ? COLORS.ocean : '#F4F4F5'}
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
              <ScrollView contentContainerStyle={{ gap: 10 }}>
                <Text style={styles.modalTitle}>
                  {adjustMode === 'ADD' ? 'Kulakan Tambah Stok' : 'Sesuaikan Stok'}
                </Text>
                <Text style={styles.dimText}>
                  {adjustTarget.wood_type} • Saat ini: {adjustTarget.stock_qty} batang
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
                      trackColor={{ false: COLORS.border, true: COLORS.oceanBorder }}
                      thumbColor={adjustCashOut ? COLORS.ocean : '#F4F4F5'}
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

                <PrimaryButton
                  title="Hapus Ukuran Stok Ini"
                  variant="ghost"
                  onPress={() => setDeleteConfirmOpen(true)}
                  disabled={submitting}
                />
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={deleteConfirmOpen}
        title="Hapus Data Stok Ini?"
        message="Data ukuran kayu ini akan dihapus dari daftar stok gudang. Riwayat nota yang sudah ada tetap aman."
        confirmLabel="Ya, Hapus"
        danger
        loading={submitting}
        onConfirm={() => void handleDeleteStock()}
        onCancel={() => setDeleteConfirmOpen(false)}
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
  listHeader: {
    gap: 10,
    marginBottom: 4,
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
  summaryStrip: {
    backgroundColor: COLORS.navyLight,
    borderRadius: SIZING.radiusMd,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetShortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: SIZING.radiusPill,
    ...SHADOWS.card,
  },
  presetShortcutText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.navy,
  },
  supplierTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SIZING.radiusSm,
    backgroundColor: COLORS.oceanLight,
  },
  supplierTagText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.ocean,
  },
  modalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  modalManageLink: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.ocean,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.ocean,
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.subhead,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
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
    alignItems: 'center',
    gap: 8,
  },
  woodIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  woodTitle: {
    fontSize: TYPOGRAPHY.heading,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
  },
  dimText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontFamily: FONTS.semiBold,
  },
  volText: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SIZING.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  priceText: {
    fontSize: TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    fontFamily: FONTS.semiBold,
  },
  priceSellText: {
    fontSize: TYPOGRAPHY.label,
    color: COLORS.navy,
    fontFamily: FONTS.extraBold,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
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
    fontFamily: FONTS.bold,
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
    fontFamily: FONTS.bold,
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
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
});
