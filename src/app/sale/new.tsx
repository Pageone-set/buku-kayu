import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
import { MoneyInput } from '../../components/ui/MoneyInput';
import { NumberStepper } from '../../components/ui/NumberStepper';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SectionCard } from '../../components/ui/SectionCard';
import { createWoodSale } from '../../db/salesRepo';
import { listWoodStocks } from '../../db/stockRepo';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, SIZING, TYPOGRAPHY } from '../../theme/tokens';
import {
  CreateWoodSaleItemInput,
  DIMENSION_PRESETS,
  LENGTH_PRESETS_CM,
  WOOD_TYPE_PRESETS,
  WoodPaymentStatus,
  WoodStock,
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

interface CartItem extends CreateWoodSaleItemInput {
  localKey: string;
  volumeM3: number;
  subtotal: number;
}

type InputSourceMode = 'STOCK' | 'CUSTOM';

export default function NewWoodSaleScreen() {
  const bumpDbRevision = useAppStore((s) => s.bumpDbRevision);
  const [stocks, setStocks] = useState<WoodStock[]>([]);
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

  useEffect(() => {
    void listWoodStocks()
      .then((rows) => {
        setStocks(rows);
        const firstAvailable = rows.find((r) => r.stock_qty > 0);
        if (firstAvailable) {
          applyStockItem(firstAvailable);
        } else {
          setSourceMode('CUSTOM');
        }
      })
      .catch(() => undefined);
  }, []);

  const applyStockItem = (stock: WoodStock) => {
    setSelectedStockId(stock.id);
    setWoodType(stock.wood_type);
    setLengthCm(String(stock.length_cm));
    setWidthCm(String(stock.width_cm));
    setThicknessCm(String(stock.thickness_cm));
    setPricePerM3(stock.sell_price_m3 || 0);
    setQty((prev) => Math.min(Math.max(1, prev), Math.max(1, stock.stock_qty)));
  };

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
                        activeOpacity={0.75}
                        onPress={() => applyStockItem(stock)}
                        style={[
                          styles.stockOption,
                          active && styles.stockOptionActive,
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.stockOptionTitle,
                              active && { color: COLORS.amberDark },
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
                          <MaterialCommunityIcons
                            name="check-circle"
                            size={24}
                            color={COLORS.amber}
                          />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })
              )}
            </View>
          ) : (
            <View style={styles.customBox}>
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
                value={`${numThickness}x${numWidth}`}
                onChange={(val) => {
                  const [t, w] = val.split('x');
                  setThicknessCm(t);
                  setWidthCm(w);
                }}
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
            </View>
          )}

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
            icon={
              <MaterialCommunityIcons
                name="plus-circle-outline"
                size={22}
                color={COLORS.textPrimary}
              />
            }
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
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={22}
                      color={COLORS.red}
                    />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.grandTotalBox}>
                <View>
                  <Text style={styles.grandLabel}>
                    Total {formatVolumeM3(cartTotals.totalVolumeM3)}
                  </Text>
                  <Text style={styles.grandTitle}>TOTAL NOTA</Text>
                </View>
                <Text style={styles.grandAmount}>
                  {formatRupiah(cartTotals.totalAmount)}
                </Text>
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
          variant="success"
          loading={saving}
          onPress={handleSaveSale}
          icon={
            <MaterialCommunityIcons
              name="content-save-check"
              size={24}
              color={COLORS.textOnDark}
            />
          }
        />
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
    fontWeight: '700',
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
    color: COLORS.textPrimary,
  },
  stockPickerList: {
    gap: 8,
  },
  stockOption: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: SIZING.radiusMd,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 10,
  },
  stockOptionActive: {
    borderColor: COLORS.amber,
    backgroundColor: COLORS.amberLight,
  },
  stockOptionTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  stockOptionSub: {
    fontSize: TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  customBox: {
    gap: 8,
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
  liveResultBox: {
    backgroundColor: COLORS.amberLight,
    borderWidth: 1.5,
    borderColor: COLORS.amberBorder,
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
    fontWeight: '700',
    color: COLORS.amberDark,
  },
  liveVolume: {
    fontSize: TYPOGRAPHY.subhead,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  livePrice: {
    fontSize: TYPOGRAPHY.amountMd,
    fontWeight: '800',
    color: COLORS.amberDark,
  },
  hintMuted: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
    lineHeight: 22,
  },
  cartHeaderVol: {
    fontSize: TYPOGRAPHY.label,
    fontWeight: '800',
    color: COLORS.amberDark,
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
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cartItemSub: {
    fontSize: TYPOGRAPHY.label,
    color: COLORS.textSecondary,
  },
  cartItemPrice: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
    color: COLORS.green,
    marginTop: 2,
  },
  removeBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.redLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grandTotalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.textPrimary,
    borderRadius: SIZING.radiusMd,
    padding: 14,
    marginTop: 4,
  },
  grandLabel: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.border,
    fontWeight: '600',
  },
  grandTitle: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textOnDark,
    fontWeight: '800',
  },
  grandAmount: {
    fontSize: TYPOGRAPHY.amountLg,
    color: COLORS.textOnDark,
    fontWeight: '800',
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
    fontWeight: '700',
    color: COLORS.red,
  },
  kasbonVal: {
    fontSize: TYPOGRAPHY.amountMd,
    fontWeight: '800',
    color: COLORS.red,
  },
});
