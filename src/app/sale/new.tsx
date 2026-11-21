import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipSelector } from '../../components/ui/ChipSelector';
import { DimensionSpecStrip } from '../../components/ui/DimensionSpecStrip';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { NumberStepper } from '../../components/ui/NumberStepper';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SectionCard } from '../../components/ui/SectionCard';
import { WoodSwatchBadge } from '../../components/ui/WoodSwatchBadge';
import { createWoodSale } from '../../db/salesRepo';
import { listWoodStocks } from '../../db/stockRepo';
import {
  createWoodDimension,
  listWoodDimensions,
  listWoodTypes,
} from '../../db/woodPresetsRepo';
import { useAppStore } from '../../store/useAppStore';
import {
  COLORS,
  FONTS,
  SIZING,
  TYPOGRAPHY,
} from '../../theme/tokens';
import {
  CreateWoodSaleItemInput,
  LENGTH_PRESETS_CM,
  WoodDimensionPreset,
  WoodPaymentStatus,
  WoodStock,
  WoodTypePreset,
} from '../../types/domain';
import {
  calculateItemSubtotal,
  calculateRemainingAmount,
  calculateSaleTotals,
  calculateVolumeM3,
} from '../../utils/cubicCalculator';
import {
  formatDimension,
  formatRupiah,
  formatVolumeM3,
} from '../../utils/formatters';
import { formatDimensionNumber } from '../../utils/woodPresetHelpers';

interface CartItem extends CreateWoodSaleItemInput {
  localKey: string;
  volumeM3: number;
  subtotal: number;
}

type InputSourceMode = 'STOCK' | 'CUSTOM';

export default function NewWoodSaleScreen() {
  const dbRevision = useAppStore((s) => s.dbRevision);
  const bumpDbRevision = useAppStore((s) => s.bumpDbRevision);
  const [stocks, setStocks] = useState<WoodStock[]>([]);
  const [woodTypes, setWoodTypes] = useState<WoodTypePreset[]>([]);
  const [dimensions, setDimensions] = useState<WoodDimensionPreset[]>([]);
  const [sourceMode, setSourceMode] = useState<InputSourceMode>('STOCK');
  const [selectedStockId, setSelectedStockId] = useState<number | null>(null);

  const [woodType, setWoodType] = useState<string>('Jati');
  const [lengthCm, setLengthCm] = useState<string>('400');
  const [widthCm, setWidthCm] = useState<string>('12');
  const [thicknessCm, setThicknessCm] = useState<string>('6');
  const [qty, setQty] = useState<number>(10);
  const [pricePerM3, setPricePerM3] = useState<number>(12000000);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [paymentStatus, setPaymentStatus] = useState<WoodPaymentStatus>('PAID');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const applyStockItem = useCallback((stock: WoodStock) => {
    setSelectedStockId(stock.id);
    setWoodType(stock.wood_type);
    setLengthCm(String(stock.length_cm));
    setWidthCm(String(stock.width_cm));
    setThicknessCm(String(stock.thickness_cm));
    setPricePerM3(stock.sell_price_m3 || 0);
    setQty((prev) => Math.min(Math.max(1, prev), Math.max(1, stock.stock_qty)));
  }, []);

  const loadPresetsAndStocks = useCallback(async () => {
    try {
      const [stockRows, typeRows, dimRows] = await Promise.all([
        listWoodStocks(),
        listWoodTypes(),
        listWoodDimensions(),
      ]);
      setStocks(stockRows);
      setWoodTypes(typeRows);
      setDimensions(dimRows);

      setSelectedStockId((currentId) => {
        if (currentId !== null) {
          return currentId;
        }
        const firstAvailable = stockRows.find((r) => r.stock_qty > 0);
        if (firstAvailable) {
          applyStockItem(firstAvailable);
          return firstAvailable.id;
        }
        setSourceMode('CUSTOM');
        return null;
      });
    } catch {
      // ignore transient error
    }
  }, [applyStockItem]);

  useFocusEffect(
    useCallback(() => {
      void loadPresetsAndStocks();
    }, [loadPresetsAndStocks])
  );

  useEffect(() => {
    void loadPresetsAndStocks();
  }, [dbRevision, loadPresetsAndStocks]);

  const woodColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of woodTypes) {
      map.set(item.name.trim().toLowerCase(), item.color_hex);
    }
    return map;
  }, [woodTypes]);

  const numLength = Number.parseFloat(lengthCm) || 0;
  const numWidth = Number.parseFloat(widthCm) || 0;
  const numThickness = Number.parseFloat(thicknessCm) || 0;

  const liveVolume = useMemo(
    () => calculateVolumeM3(numLength, numWidth, numThickness, qty),
    [numLength, numWidth, numThickness, qty]
  );
  const liveSubtotal = useMemo(
    () => calculateItemSubtotal(liveVolume, pricePerM3),
    [liveVolume, pricePerM3]
  );

  const selectedStock = useMemo(
    () => stocks.find((s) => s.id === selectedStockId) ?? null,
    [stocks, selectedStockId]
  );

  const cartTotals = useMemo(() => calculateSaleTotals(cart), [cart]);
  const remainingKasbon = useMemo(
    () =>
      paymentStatus === 'PAID'
        ? 0
        : calculateRemainingAmount(cartTotals.totalAmount, paidAmount),
    [cartTotals.totalAmount, paidAmount, paymentStatus]
  );

  const handleAddToCart = () => {
    if (!woodType.trim()) {
      Alert.alert('Periksa Isian', 'Pilih atau isi jenis kayu terlebih dahulu.');
      return;
    }
    if (numLength <= 0 || numWidth <= 0 || numThickness <= 0 || qty <= 0) {
      Alert.alert('Periksa Ukuran', 'Ukuran dan jumlah batang harus lebih dari 0.');
      return;
    }
    if (pricePerM3 <= 0) {
      Alert.alert('Periksa Harga', 'Isi harga jual per m³ lebih dari Rp 0.');
      return;
    }

    if (sourceMode === 'STOCK' && selectedStock) {
      const alreadyInCart = cart
        .filter((c) => c.stockId === selectedStock.id)
        .reduce((sum, c) => sum + c.qty, 0);
      if (alreadyInCart + qty > selectedStock.stock_qty) {
        Alert.alert(
          'Stok Tidak Cukup',
          `Stok ${selectedStock.wood_type} hanya tersisa ${selectedStock.stock_qty} batang.`
        );
        return;
      }
    }

    const newItem: CartItem = {
      localKey: `${Date.now()}-${Math.random()}`,
      stockId: sourceMode === 'STOCK' && selectedStock ? selectedStock.id : null,
      woodType: woodType.trim(),
      lengthCm: numLength,
      widthCm: numWidth,
      thicknessCm: numThickness,
      qty,
      pricePerM3,
      volumeM3: liveVolume,
      subtotal: liveSubtotal,
    };

    setCart((prev) => [...prev, newItem]);
  };

  const handleRemoveCartItem = (localKey: string) => {
    setCart((prev) => prev.filter((item) => item.localKey !== localKey));
  };

  const handleSaveSale = async () => {
    if (cart.length === 0) {
      Alert.alert(
        'Nota Masih Kosong',
        'Tekan "+ Tambah ke Nota" untuk memasukkan ukuran kayu terlebih dahulu.'
      );
      return;
    }
    if (paymentStatus === 'PARTIAL' && !customerName.trim()) {
      Alert.alert(
        'Nama Pembeli Wajib Diisi',
        'Untuk pembayaran Kasbon / Kurang Bayar, wajib isi nama pembeli.'
      );
      return;
    }
    if (paymentStatus === 'PARTIAL' && paidAmount > cartTotals.totalAmount) {
      Alert.alert(
        'Nominal DP Kebesaran',
        'Nominal DP tidak boleh melebihi total nota.'
      );
      return;
    }

    setSaving(true);
    try {
      const saleId = await createWoodSale({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        paymentStatus,
        paidAmount: paymentStatus === 'PAID' ? cartTotals.totalAmount : paidAmount,
        notes: notes.trim(),
        items: cart.map(({ localKey: _k, volumeM3: _v, subtotal: _s, ...item }) => item),
      });
      bumpDbRevision(true);
      router.replace(`/sale/${saleId}`);
    } catch (error) {
      Alert.alert(
        'Gagal Menyimpan Nota',
        error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <SectionCard title="1. Hitung Ukuran Kayu">
          <ChipSelector
            options={[
              { label: 'Ambil dari Stok Balok', value: 'STOCK' as InputSourceMode },
              { label: 'Ukuran Bebas', value: 'CUSTOM' as InputSourceMode },
            ]}
            value={sourceMode}
            onChange={(mode) => {
              setSourceMode(mode);
              if (mode === 'CUSTOM') {
                setSelectedStockId(null);
              } else if (stocks.length > 0 && !selectedStockId) {
                const firstAvail = stocks.find((s) => s.stock_qty > 0);
                if (firstAvail) {
                  applyStockItem(firstAvail);
                }
              }
            }}
          />

          {sourceMode === 'STOCK' ? (
            <View style={styles.stockPickerList}>
              {stocks.filter((s) => s.stock_qty > 0).length === 0 ? (
                <Text style={styles.hintMuted}>
                  Stok gudang sedang kosong. Pakai "Ukuran Bebas" atau isi stok dulu.
                </Text>
              ) : (
                stocks
                  .filter((s) => s.stock_qty > 0)
                  .map((stock) => {
                    const active = stock.id === selectedStockId;
                    return (
                      <TouchableOpacity
                        key={stock.id}
                        activeOpacity={0.78}
                        onPress={() => applyStockItem(stock)}
                        style={[
                          styles.stockOption,
                          active && styles.stockOptionActive,
                        ]}
                      >
                        <WoodSwatchBadge
                          woodType={stock.wood_type}
                          colorHex={woodColorMap.get(
                            stock.wood_type.trim().toLowerCase()
                          )}
                          size={18}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.stockOptionTitle,
                              active && { color: COLORS.navy },
                            ]}
                          >
                            {stock.wood_type} •{' '}
                            {formatDimension(
                              stock.length_cm,
                              stock.width_cm,
                              stock.thickness_cm
                            )}
                          </Text>
                          <Text style={styles.stockOptionSub}>
                            Sisa: {stock.stock_qty} btg • Jual:{' '}
                            {formatRupiah(stock.sell_price_m3)}/m³
                          </Text>
                        </View>
                        {active ? (
                          <Feather
                            name="check-circle"
                            size={22}
                            color={COLORS.ocean}
                          />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })
              )}
            </View>
          ) : (
            <View style={styles.customBox}>
              <View style={styles.sectionHeaderInline}>
                <Text style={styles.fieldLabel}>Pilih Jenis Kayu</Text>
                <TouchableOpacity
                  activeOpacity={0.78}
                  onPress={() => router.push('/settings/wood-presets?tab=wood')}
                  style={styles.manageLinkPill}
                >
                  <Feather name="sliders" size={13} color={COLORS.ocean} />
                  <Text style={styles.manageLinkText}>Atur / + Tambah</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.circlePresetRow}
              >
                {woodTypes.map((preset) => {
                  const active =
                    woodType.trim().toLowerCase() ===
                    preset.name.trim().toLowerCase();
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      activeOpacity={0.78}
                      onPress={() => {
                        setWoodType(preset.name);
                        if (preset.default_price_m3 > 0) {
                          setPricePerM3(preset.default_price_m3);
                        }
                      }}
                      style={styles.circlePresetItem}
                    >
                      <View
                        style={[
                          styles.circleWell,
                          active && styles.circleWellActive,
                        ]}
                      >
                        <View
                          style={[
                            styles.swatchDot,
                            { backgroundColor: preset.color_hex },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.circlePresetLabel,
                          active && styles.circlePresetLabelActive,
                        ]}
                        numberOfLines={1}
                      >
                        {preset.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  activeOpacity={0.78}
                  onPress={() => router.push('/settings/wood-presets?tab=wood')}
                  style={styles.circlePresetItem}
                >
                  <View style={[styles.circleWell, styles.circleWellAdd]}>
                    <Feather name="plus" size={20} color={COLORS.ocean} />
                  </View>
                  <Text style={styles.circlePresetAddLabel}>Tambah</Text>
                </TouchableOpacity>
              </ScrollView>

              <TextInput
                style={styles.textInput}
                value={woodType}
                onChangeText={setWoodType}
                placeholder="Atau ketik jenis kayu lain..."
                placeholderTextColor={COLORS.textMuted}
              />

              <View style={styles.sectionHeaderInline}>
                <Text style={styles.fieldLabel}>Ukuran Standar (T × L cm)</Text>
                <TouchableOpacity
                  activeOpacity={0.78}
                  onPress={() => router.push('/settings/wood-presets?tab=size')}
                  style={styles.manageLinkPill}
                >
                  <Feather name="edit-2" size={13} color={COLORS.ocean} />
                  <Text style={styles.manageLinkText}>Atur Ukuran</Text>
                </TouchableOpacity>
              </View>

              <ChipSelector
                options={dimensions.map((d) => ({
                  label: d.label,
                  value: `${formatDimensionNumber(d.thickness_cm)}x${formatDimensionNumber(
                    d.width_cm
                  )}x${formatDimensionNumber(d.default_length_cm)}`,
                }))}
                value={`${formatDimensionNumber(numThickness)}x${formatDimensionNumber(
                  numWidth
                )}x${formatDimensionNumber(numLength)}`}
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
                  label: `${p} cm (${p / 100}m)`,
                  value: p,
                }))}
                value={numLength}
                onChange={(val) => setLengthCm(String(val))}
              />

              <View style={styles.dimRow}>
                <View style={styles.dimCol}>
                  <Text style={styles.dimLabel}>Panjang (cm)</Text>
                  <TextInput
                    style={styles.dimInput}
                    value={lengthCm}
                    onChangeText={setLengthCm}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.dimCol}>
                  <Text style={styles.dimLabel}>Lebar (cm)</Text>
                  <TextInput
                    style={styles.dimInput}
                    value={widthCm}
                    onChangeText={setWidthCm}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.dimCol}>
                  <Text style={styles.dimLabel}>Tebal (cm)</Text>
                  <TextInput
                    style={styles.dimInput}
                    value={thicknessCm}
                    onChangeText={setThicknessCm}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {numThickness > 0 &&
              numWidth > 0 &&
              numLength > 0 &&
              !dimensions.some(
                (d) =>
                  d.thickness_cm === numThickness &&
                  d.width_cm === numWidth &&
                  d.default_length_cm === numLength
              ) ? (
                <TouchableOpacity
                  activeOpacity={0.78}
                  onPress={async () => {
                    try {
                      await createWoodDimension({
                        thicknessCm: numThickness,
                        widthCm: numWidth,
                        defaultLengthCm: numLength,
                      });
                      bumpDbRevision(true);
                      await loadPresetsAndStocks();
                      Alert.alert(
                        'Ukuran Disimpan',
                        `Ukuran ${formatDimensionNumber(
                          numThickness
                        )}×${formatDimensionNumber(
                          numWidth
                        )} (${formatDimensionNumber(
                          numLength
                        )} cm) ditambahkan ke daftar Ukuran Standar.`
                      );
                    } catch (err) {
                      Alert.alert(
                        'Gagal Simpan Ukuran',
                        err instanceof Error ? err.message : 'Coba lagi.'
                      );
                    }
                  }}
                  style={styles.saveQuickDimBtn}
                >
                  <Feather name="bookmark" size={14} color={COLORS.ocean} />
                  <Text style={styles.saveQuickDimText}>
                    + Simpan ukuran {formatDimensionNumber(numThickness)}×
                    {formatDimensionNumber(numWidth)} ({formatDimensionNumber(numLength)} cm) ke daftar
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          <DimensionSpecStrip
            lengthCm={numLength}
            widthCm={numWidth}
            thicknessCm={numThickness}
          />

          <NumberStepper
            label="Jumlah Batang"
            value={qty}
            onChange={setQty}
            min={1}
            max={
              sourceMode === 'STOCK' && selectedStock
                ? Math.max(1, selectedStock.stock_qty)
                : 9999
            }
          />

          <MoneyInput
            label="Harga Jual per m³"
            value={pricePerM3}
            onChangeValue={setPricePerM3}
            helperText="Per 1 kubik"
          />

          <View style={styles.liveResultBox}>
            <View style={styles.liveRow}>
              <Text style={styles.liveLabel}>Kubikasi Item Ini</Text>
              <Text style={styles.liveVolume}>{formatVolumeM3(liveVolume)}</Text>
            </View>
            <View style={styles.liveRow}>
              <Text style={styles.liveLabel}>Subtotal Harga</Text>
              <Text style={styles.livePrice}>{formatRupiah(liveSubtotal)}</Text>
            </View>
          </View>

          <PrimaryButton
            title="+ Tambah ke Nota"
            variant="outline"
            onPress={handleAddToCart}
            icon={<Feather name="plus-circle" size={19} color={COLORS.ocean} />}
          />
        </SectionCard>

        <SectionCard
          title={`2. Daftar Kayu di Nota (${cart.length} item)`}
          rightElement={
            cart.length > 0 ? (
              <Text style={styles.cartHeaderVol}>
                {formatVolumeM3(cartTotals.totalVolumeM3)}
              </Text>
            ) : undefined
          }
        >
          {cart.length === 0 ? (
            <Text style={styles.hintMuted}>
              Belum ada item di nota. Bisa tambah beberapa ukuran berbeda ke 1 nota.
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {cart.map((item, idx) => (
                <View key={item.localKey} style={styles.cartItem}>
                  <WoodSwatchBadge
                    woodType={item.woodType}
                    colorHex={woodColorMap.get(item.woodType.trim().toLowerCase())}
                    size={14}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.cartItemTitle}>
                      {idx + 1}. {item.woodType} (
                      {formatDimension(
                        item.lengthCm,
                        item.widthCm,
                        item.thicknessCm
                      )}
                      )
                    </Text>
                    <Text style={styles.cartItemSub}>
                      {item.qty} btg • {formatVolumeM3(item.volumeM3)} ×{' '}
                      {formatRupiah(item.pricePerM3)}/m³
                    </Text>
                    <Text style={styles.cartItemPrice}>
                      {formatRupiah(item.subtotal)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveCartItem(item.localKey)}
                    style={styles.removeBtn}
                    accessibilityLabel="Hapus item"
                  >
                    <Feather name="trash-2" size={18} color={COLORS.red} />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.grandSummaryCard}>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryKey}>Total Batang</Text>
                  <Text style={styles.summaryVal}>
                    {cart.reduce((s, c) => s + c.qty, 0)} Batang
                  </Text>
                </View>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryKey}>Total Kubikasi</Text>
                  <Text style={styles.summaryVal}>
                    {formatVolumeM3(cartTotals.totalVolumeM3)}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryLine}>
                  <Text style={styles.grandTitle}>Total Harga Nota</Text>
                  <Text style={styles.grandAmount}>
                    {formatRupiah(cartTotals.totalAmount)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </SectionCard>

        <SectionCard title="3. Pembayaran & Pembeli">
          <ChipSelector
            options={[
              { label: 'Lunas', value: 'PAID' as WoodPaymentStatus },
              { label: 'Kasbon / Kurang Bayar', value: 'PARTIAL' as WoodPaymentStatus },
            ]}
            value={paymentStatus}
            onChange={(val) => {
              setPaymentStatus(val);
              if (val === 'PARTIAL') {
                setPaidAmount(0);
              }
            }}
          />

          <Text style={styles.fieldLabel}>
            Nama Pembeli {paymentStatus === 'PARTIAL' ? '(Wajib untuk Kasbon)' : '(Opsional)'}
          </Text>
          <TextInput
            style={styles.textInput}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Contoh: Pak Budi / Toko Maju"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.fieldLabel}>No. WhatsApp Pembeli (Opsional)</Text>
          <TextInput
            style={styles.textInput}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
            placeholder="Contoh: 081234567890"
            placeholderTextColor={COLORS.textMuted}
          />

          {paymentStatus === 'PARTIAL' ? (
            <View style={{ gap: 8 }}>
              <MoneyInput
                label="Uang Muka / DP yang Diterima"
                value={paidAmount}
                onChangeValue={setPaidAmount}
              />
              <View style={styles.kasbonBox}>
                <Text style={styles.kasbonLabel}>Sisa Kurang Bayar:</Text>
                <Text style={styles.kasbonVal}>
                  {formatRupiah(remainingKasbon)}
                </Text>
              </View>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Catatan (Opsional)</Text>
          <TextInput
            style={styles.textInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Contoh: Diantar sore ke lokasi proyek"
            placeholderTextColor={COLORS.textMuted}
          />
        </SectionCard>

        <PrimaryButton
          title="Simpan Nota Penjualan"
          size="lg"
          variant="primary"
          loading={saving}
          onPress={handleSaveSale}
          icon={<Feather name="check" size={20} color={COLORS.textOnDark} />}
        />

        <View style={styles.offlineReassurance}>
          <Feather name="shield" size={14} color={COLORS.green} />
          <Text style={styles.offlineReassuranceText}>
            Otomatis potong stok &amp; catat di Buku Kas
          </Text>
        </View>
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
    paddingBottom: 36,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginTop: 4,
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
  stockPickerList: {
    gap: 8,
  },
  stockOption: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: SIZING.radiusMd,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 12,
  },
  stockOptionActive: {
    borderColor: COLORS.ocean,
    backgroundColor: COLORS.oceanLight,
  },
  stockOptionTitle: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  stockOptionSub: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  customBox: {
    gap: 10,
  },
  sectionHeaderInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  manageLinkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: SIZING.radiusPill,
    backgroundColor: COLORS.oceanLight,
  },
  manageLinkText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.ocean,
  },
  circlePresetRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  circlePresetItem: {
    width: 66,
    alignItems: 'center',
    gap: 6,
  },
  circleWell: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleWellActive: {
    backgroundColor: COLORS.charcoal,
    borderColor: COLORS.charcoal,
  },
  circleWellAdd: {
    backgroundColor: COLORS.oceanLight,
    borderColor: COLORS.oceanBorder,
    borderStyle: 'dashed',
  },
  swatchDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  circlePresetLabel: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  circlePresetLabelActive: {
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
  },
  circlePresetAddLabel: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.ocean,
  },
  saveQuickDimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.oceanLight,
    borderRadius: SIZING.radiusPill,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  saveQuickDimText: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.ocean,
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
    fontVariant: ['tabular-nums'],
  },
  liveResultBox: {
    backgroundColor: COLORS.navyLight,
    borderWidth: 1,
    borderColor: COLORS.navyBorder,
    borderRadius: SIZING.radiusMd,
    padding: 14,
    gap: 6,
  },
  liveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveLabel: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.bold,
    color: COLORS.navy,
  },
  liveVolume: {
    fontSize: TYPOGRAPHY.subhead,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  livePrice: {
    fontSize: TYPOGRAPHY.amountMd,
    fontFamily: FONTS.extraBold,
    color: COLORS.navy,
    fontVariant: ['tabular-nums'],
  },
  hintMuted: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    lineHeight: 22,
  },
  cartHeaderVol: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.extraBold,
    color: COLORS.ocean,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: SIZING.radiusMd,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  cartItemTitle: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  cartItemSub: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  cartItemPrice: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.extraBold,
    color: COLORS.green,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  removeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.redLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grandSummaryCard: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SIZING.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 8,
    marginTop: 4,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryKey: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  summaryVal: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.borderStrong,
  },
  grandTitle: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontFamily: FONTS.extraBold,
  },
  grandAmount: {
    fontSize: TYPOGRAPHY.amountLg,
    color: COLORS.navy,
    fontFamily: FONTS.extraBold,
    fontVariant: ['tabular-nums'],
  },
  kasbonBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.redLight,
    borderWidth: 1,
    borderColor: COLORS.redBorder,
    borderRadius: SIZING.radiusMd,
    padding: 12,
  },
  kasbonLabel: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.bold,
    color: COLORS.red,
  },
  kasbonVal: {
    fontSize: TYPOGRAPHY.amountMd,
    fontFamily: FONTS.extraBold,
    color: COLORS.red,
    fontVariant: ['tabular-nums'],
  },
  offlineReassurance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  offlineReassuranceText: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
});
