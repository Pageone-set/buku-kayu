import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipSelector } from '../../components/ui/ChipSelector';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { DimensionSpecStrip } from '../../components/ui/DimensionSpecStrip';
import { EmptyState } from '../../components/ui/EmptyState';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { WoodSwatchBadge } from '../../components/ui/WoodSwatchBadge';
import {
  createWoodDimension,
  createWoodType,
  deleteWoodDimension,
  deleteWoodType,
  listWoodDimensions,
  listWoodTypes,
  updateWoodDimension,
  updateWoodMarketPrice,
  updateWoodType,
} from '../../db/woodPresetsRepo';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, FONTS, SHADOWS, SIZING, TYPOGRAPHY } from '../../theme/tokens';
import {
  LENGTH_PRESETS_CM,
  WoodDimensionPreset,
  WoodTypePreset,
} from '../../types/domain';
import { formatDateTimeIndo, formatRupiah } from '../../utils/formatters';
import {
  WOOD_SWATCH_PALETTE,
  buildDimensionLabel,
  calculatePriceMarginPerM3,
  formatDimensionNumber,
} from '../../utils/woodPresetHelpers';

type PresetTab = 'wood' | 'size';

export default function WoodPresetsScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const dbRevision = useAppStore((s) => s.dbRevision);
  const bumpDbRevision = useAppStore((s) => s.bumpDbRevision);

  const [activeTab, setActiveTab] = useState<PresetTab>(
    tab === 'size' ? 'size' : 'wood'
  );
  const [woodTypes, setWoodTypes] = useState<WoodTypePreset[]>([]);
  const [dimensions, setDimensions] = useState<WoodDimensionPreset[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Modal Tambah/Edit Jenis Kayu
  const [woodModalOpen, setWoodModalOpen] = useState(false);
  const [editingWood, setEditingWood] = useState<WoodTypePreset | null>(null);
  const [woodName, setWoodName] = useState('');
  const [woodColor, setWoodColor] = useState<string>(WOOD_SWATCH_PALETTE[0].hex);
  const [woodBuyPrice, setWoodBuyPrice] = useState(0);
  const [woodPrice, setWoodPrice] = useState(0);
  const [deleteWoodTarget, setDeleteWoodTarget] =
    useState<WoodTypePreset | null>(null);

  // Modal Cepat Ubah Harga Pasar
  const [priceTarget, setPriceTarget] = useState<WoodTypePreset | null>(null);
  const [marketBuyPrice, setMarketBuyPrice] = useState(0);
  const [marketSellPrice, setMarketSellPrice] = useState(0);
  const [syncMarketToStocks, setSyncMarketToStocks] = useState(true);

  // Modal Tambah/Edit Ukuran
  const [sizeModalOpen, setSizeModalOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<WoodDimensionPreset | null>(
    null
  );
  const [sizeThickness, setSizeThickness] = useState('6');
  const [sizeWidth, setSizeWidth] = useState('12');
  const [sizeLength, setSizeLength] = useState('400');
  const [sizeLabel, setSizeLabel] = useState('');
  const [deleteSizeTarget, setDeleteSizeTarget] =
    useState<WoodDimensionPreset | null>(null);

  useEffect(() => {
    if (tab === 'size') {
      setActiveTab('size');
    } else if (tab === 'wood') {
      setActiveTab('wood');
    }
  }, [tab]);

  const loadPresets = useCallback(async () => {
    try {
      const [types, dims] = await Promise.all([
        listWoodTypes(),
        listWoodDimensions(),
      ]);
      setWoodTypes(types);
      setDimensions(dims);
    } catch {
      // ignore transient load error
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPresets();
    }, [loadPresets])
  );

  useEffect(() => {
    void loadPresets();
  }, [dbRevision, loadPresets]);

  const openAddWoodModal = () => {
    setEditingWood(null);
    setWoodName('');
    setWoodColor(WOOD_SWATCH_PALETTE[0].hex);
    setWoodBuyPrice(0);
    setWoodPrice(0);
    setWoodModalOpen(true);
  };

  const openEditWoodModal = (item: WoodTypePreset) => {
    setEditingWood(item);
    setWoodName(item.name);
    setWoodColor(item.color_hex);
    setWoodBuyPrice(item.default_buy_price_m3 || 0);
    setWoodPrice(item.default_price_m3 || 0);
    setWoodModalOpen(true);
  };

  const handleSaveWood = async () => {
    setSubmitting(true);
    try {
      if (editingWood) {
        await updateWoodType(editingWood.id, {
          name: woodName,
          colorHex: woodColor,
          defaultBuyPriceM3: woodBuyPrice,
          defaultPriceM3: woodPrice,
        });
      } else {
        await createWoodType({
          name: woodName,
          colorHex: woodColor,
          defaultBuyPriceM3: woodBuyPrice,
          defaultPriceM3: woodPrice,
        });
      }
      setWoodModalOpen(false);
      bumpDbRevision(true);
      await loadPresets();
    } catch (error) {
      Alert.alert(
        'Periksa Jenis Kayu',
        error instanceof Error ? error.message : 'Gagal menyimpan jenis kayu.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openMarketPriceModal = (item: WoodTypePreset) => {
    setPriceTarget(item);
    setMarketBuyPrice(item.default_buy_price_m3 || 0);
    setMarketSellPrice(item.default_price_m3 || 0);
    setSyncMarketToStocks(true);
  };

  const handleSaveMarketPrice = async () => {
    if (!priceTarget) {
      return;
    }
    setSubmitting(true);
    try {
      const { syncedStocksCount } = await updateWoodMarketPrice({
        id: priceTarget.id,
        buyPriceM3: marketBuyPrice,
        sellPriceM3: marketSellPrice,
        syncToStocks: syncMarketToStocks,
      });
      const updatedName = priceTarget.name;
      setPriceTarget(null);
      bumpDbRevision(true);
      await loadPresets();

      Alert.alert(
        'Harga Pasar Diperbarui',
        syncedStocksCount > 0
          ? `Harga pasar kayu ${updatedName} diperbarui dan disinkronkan ke ${syncedStocksCount} item stok gudang.`
          : `Harga pasar kayu ${updatedName} berhasil diperbarui.`
      );
    } catch (error) {
      Alert.alert(
        'Gagal Ubah Harga Pasar',
        error instanceof Error ? error.message : 'Periksa nominal harga.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteWood = async () => {
    if (!deleteWoodTarget) {
      return;
    }
    setSubmitting(true);
    try {
      await deleteWoodType(deleteWoodTarget.id);
      setDeleteWoodTarget(null);
      bumpDbRevision(true);
      await loadPresets();
    } catch (error) {
      Alert.alert(
        'Gagal Menghapus',
        error instanceof Error ? error.message : 'Coba lagi.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openAddSizeModal = () => {
    setEditingSize(null);
    setSizeThickness('6');
    setSizeWidth('12');
    setSizeLength('400');
    setSizeLabel('');
    setSizeModalOpen(true);
  };

  const openEditSizeModal = (item: WoodDimensionPreset) => {
    setEditingSize(item);
    setSizeThickness(formatDimensionNumber(item.thickness_cm));
    setSizeWidth(formatDimensionNumber(item.width_cm));
    setSizeLength(formatDimensionNumber(item.default_length_cm));
    const autoLabel = `${formatDimensionNumber(item.thickness_cm)}×${formatDimensionNumber(item.width_cm)}`;
    setSizeLabel(item.label === autoLabel ? '' : item.label);
    setSizeModalOpen(true);
  };

  const parsedT = Number.parseFloat(sizeThickness) || 0;
  const parsedW = Number.parseFloat(sizeWidth) || 0;
  const parsedL = Number.parseFloat(sizeLength) || 0;
  const previewSizeLabel =
    parsedT > 0 && parsedW > 0
      ? buildDimensionLabel(parsedT, parsedW, sizeLabel)
      : '-';

  const handleSaveSize = async () => {
    setSubmitting(true);
    try {
      if (editingSize) {
        await updateWoodDimension(editingSize.id, {
          label: sizeLabel,
          thicknessCm: parsedT,
          widthCm: parsedW,
          defaultLengthCm: parsedL,
        });
      } else {
        await createWoodDimension({
          label: sizeLabel,
          thicknessCm: parsedT,
          widthCm: parsedW,
          defaultLengthCm: parsedL,
        });
      }
      setSizeModalOpen(false);
      bumpDbRevision(true);
      await loadPresets();
    } catch (error) {
      Alert.alert(
        'Periksa Ukuran Kayu',
        error instanceof Error ? error.message : 'Gagal menyimpan ukuran.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteSize = async () => {
    if (!deleteSizeTarget) {
      return;
    }
    setSubmitting(true);
    try {
      await deleteWoodDimension(deleteSizeTarget.id);
      setDeleteSizeTarget(null);
      bumpDbRevision(true);
      await loadPresets();
    } catch (error) {
      Alert.alert(
        'Gagal Menghapus',
        error instanceof Error ? error.message : 'Coba lagi.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const liveModalMargin = calculatePriceMarginPerM3(
    marketBuyPrice,
    marketSellPrice
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.subtitle}>
          Atur jenis kayu, perbarui harga beli &amp; jual mengikuti harga pasar
          terbaru, serta kelola ukuran cepat balok/papan bengkel Anda.
        </Text>

        <ChipSelector
          options={[
            { label: `Jenis Kayu (${woodTypes.length})`, value: 'wood' as PresetTab },
            {
              label: `Ukuran Standar (${dimensions.length})`,
              value: 'size' as PresetTab,
            },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'wood' ? (
          <View style={styles.sectionWrap}>
            <PrimaryButton
              title="+ Tambah Jenis Kayu"
              variant="primary"
              onPress={openAddWoodModal}
              icon={<Feather name="plus" size={19} color={COLORS.textOnDark} />}
            />

            {woodTypes.length === 0 ? (
              <EmptyState
                icon={<Feather name="sliders" size={32} color={COLORS.textMuted} />}
                title="Belum ada daftar jenis kayu"
                subtitle="Tambahkan jenis kayu seperti Jati, Mahoni, Meranti, atau Bengkirai agar cepat dipilih saat jual kayu."
              />
            ) : (
              woodTypes.map((item) => {
                const margin = calculatePriceMarginPerM3(
                  item.default_buy_price_m3 || 0,
                  item.default_price_m3 || 0
                );
                const hasBothPrices =
                  (item.default_buy_price_m3 || 0) > 0 &&
                  (item.default_price_m3 || 0) > 0;

                return (
                  <View key={item.id} style={styles.woodCard}>
                    <View style={styles.woodCardTop}>
                      <View style={styles.cardLeft}>
                        <WoodSwatchBadge
                          woodType={item.name}
                          colorHex={item.color_hex}
                          size={22}
                        />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.cardTitle}>{item.name}</Text>
                          {item.price_updated_at ? (
                            <Text style={styles.cardMeta}>
                              Update harga: {formatDateTimeIndo(item.price_updated_at)}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          activeOpacity={0.78}
                          onPress={() => openEditWoodModal(item)}
                          style={styles.editIconBtn}
                          accessibilityLabel={`Ubah ${item.name}`}
                        >
                          <Feather name="edit-2" size={17} color={COLORS.ocean} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.78}
                          onPress={() => setDeleteWoodTarget(item)}
                          style={styles.deleteIconBtn}
                          accessibilityLabel={`Hapus ${item.name}`}
                        >
                          <Feather name="trash-2" size={17} color={COLORS.red} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.priceGrid}>
                      <View style={styles.priceCol}>
                        <Text style={styles.priceGridLabel}>Harga Beli Pasar</Text>
                        <Text style={styles.priceBuyVal}>
                          {(item.default_buy_price_m3 || 0) > 0
                            ? `${formatRupiah(item.default_buy_price_m3)}/m³`
                            : 'Belum diisi'}
                        </Text>
                      </View>
                      <View style={styles.priceDivider} />
                      <View style={styles.priceCol}>
                        <Text style={styles.priceGridLabel}>Harga Jual Pasar</Text>
                        <Text style={styles.priceSellVal}>
                          {(item.default_price_m3 || 0) > 0
                            ? `${formatRupiah(item.default_price_m3)}/m³`
                            : 'Belum diisi'}
                        </Text>
                      </View>
                    </View>

                    {hasBothPrices ? (
                      <View style={styles.marginStrip}>
                        <Text style={styles.marginLabel}>Selisih per m³:</Text>
                        <Text
                          style={[
                            styles.marginValue,
                            { color: margin >= 0 ? COLORS.green : COLORS.red },
                          ]}
                        >
                          {margin >= 0 ? '+' : ''}
                          {formatRupiah(margin)}
                        </Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => openMarketPriceModal(item)}
                      style={styles.marketPriceBtn}
                    >
                      <Feather name="trending-up" size={16} color={COLORS.navy} />
                      <Text style={styles.marketPriceBtnText}>
                        Ubah Harga Pasar
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <View style={styles.sectionWrap}>
            <PrimaryButton
              title="+ Tambah Ukuran Standar"
              variant="ocean"
              onPress={openAddSizeModal}
              icon={<Feather name="plus" size={19} color={COLORS.textOnDark} />}
            />

            {dimensions.length === 0 ? (
              <EmptyState
                icon={<Feather name="sliders" size={32} color={COLORS.textMuted} />}
                title="Belum ada daftar ukuran standar"
                subtitle="Tambahkan ukuran balok/papan yang sering dipakai agar tinggal ketuk sekali saat mencatat."
              />
            ) : (
              dimensions.map((item) => (
                <View key={item.id} style={styles.sizeCard}>
                  <View style={styles.sizeCardTop}>
                    <Text style={styles.cardTitle}>{item.label}</Text>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        activeOpacity={0.78}
                        onPress={() => openEditSizeModal(item)}
                        style={styles.editIconBtn}
                        accessibilityLabel={`Ubah ukuran ${item.label}`}
                      >
                        <Feather name="edit-2" size={17} color={COLORS.ocean} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.78}
                        onPress={() => setDeleteSizeTarget(item)}
                        style={styles.deleteIconBtn}
                        accessibilityLabel={`Hapus ukuran ${item.label}`}
                      >
                        <Feather name="trash-2" size={17} color={COLORS.red} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <DimensionSpecStrip
                    lengthCm={item.default_length_cm}
                    widthCm={item.width_cm}
                    thicknessCm={item.thickness_cm}
                    compact
                  />
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal Tambah/Edit Jenis Kayu */}
      <Modal
        visible={woodModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setWoodModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <Text style={styles.modalTitle}>
                {editingWood ? 'Edit Jenis Kayu' : 'Tambah Jenis Kayu Baru'}
              </Text>

              <Text style={styles.fieldLabel}>Nama Jenis Kayu *</Text>
              <TextInput
                style={styles.textInput}
                value={woodName}
                onChangeText={setWoodName}
                placeholder="Contoh: Meranti / Bengkirai / Trembesi"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.fieldLabel}>Pilih Warna Tanda Kayu</Text>
              <View style={styles.paletteGrid}>
                {WOOD_SWATCH_PALETTE.map((swatch) => {
                  const selected =
                    woodColor.toLowerCase() === swatch.hex.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={swatch.hex}
                      activeOpacity={0.78}
                      onPress={() => setWoodColor(swatch.hex)}
                      style={styles.paletteItem}
                    >
                      <View
                        style={[
                          styles.paletteCircle,
                          selected && styles.paletteCircleSelected,
                        ]}
                      >
                        <View
                          style={[
                            styles.paletteDot,
                            { backgroundColor: swatch.hex },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.paletteLabel,
                          selected && styles.paletteLabelSelected,
                        ]}
                      >
                        {swatch.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <MoneyInput
                label="Harga Beli Pasar per m³ (Opsional)"
                value={woodBuyPrice}
                onChangeValue={setWoodBuyPrice}
                helperText="Acuan harga kulakan saat ini"
              />

              <MoneyInput
                label="Harga Jual Pasar per m³ (Opsional)"
                value={woodPrice}
                onChangeValue={setWoodPrice}
                helperText="Otomatis terisi saat memilih kayu ini"
              />

              <View style={styles.modalActions}>
                <PrimaryButton
                  title="Batal"
                  variant="outline"
                  onPress={() => setWoodModalOpen(false)}
                  disabled={submitting}
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  title="Simpan"
                  variant="primary"
                  loading={submitting}
                  onPress={() => void handleSaveWood()}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Cepat Ubah Harga Pasar */}
      <Modal
        visible={priceTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPriceTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {priceTarget ? (
              <ScrollView contentContainerStyle={{ gap: 12 }}>
                <Text style={styles.modalTitle}>
                  Ubah Harga Pasar — {priceTarget.name}
                </Text>
                <Text style={styles.cardMeta}>
                  Sesuaikan harga beli &amp; jual per m³ mengikuti harga pasar
                  kayu hari ini.
                </Text>

                <MoneyInput
                  label="Harga Beli Pasar per m³"
                  value={marketBuyPrice}
                  onChangeValue={setMarketBuyPrice}
                />

                <MoneyInput
                  label="Harga Jual Pasar per m³"
                  value={marketSellPrice}
                  onChangeValue={setMarketSellPrice}
                />

                {marketBuyPrice > 0 && marketSellPrice > 0 ? (
                  <View style={styles.previewBox}>
                    <Text style={styles.previewLabel}>
                      Perkiraan Selisih Untung per m³
                    </Text>
                    <Text
                      style={[
                        styles.previewValue,
                        {
                          color: liveModalMargin >= 0 ? COLORS.green : COLORS.red,
                        },
                      ]}
                    >
                      {liveModalMargin >= 0 ? '+' : ''}
                      {formatRupiah(liveModalMargin)} / m³
                    </Text>
                  </View>
                ) : null}

                <View style={styles.switchRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.switchLabel}>
                      Perbarui juga harga di Stok Balok {priceTarget.name}
                    </Text>
                    <Text style={styles.cardMeta}>
                      Semua stok gudang jenis ini ikut memakai harga pasar baru
                    </Text>
                  </View>
                  <Switch
                    value={syncMarketToStocks}
                    onValueChange={setSyncMarketToStocks}
                    trackColor={{ false: COLORS.border, true: COLORS.oceanBorder }}
                    thumbColor={syncMarketToStocks ? COLORS.ocean : '#F4F4F5'}
                  />
                </View>

                <View style={styles.modalActions}>
                  <PrimaryButton
                    title="Batal"
                    variant="outline"
                    onPress={() => setPriceTarget(null)}
                    disabled={submitting}
                    style={{ flex: 1 }}
                  />
                  <PrimaryButton
                    title="Simpan Harga"
                    variant="primary"
                    loading={submitting}
                    onPress={() => void handleSaveMarketPrice()}
                    style={{ flex: 1 }}
                  />
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Modal Tambah/Edit Ukuran Standar */}
      <Modal
        visible={sizeModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSizeModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <Text style={styles.modalTitle}>
                {editingSize
                  ? 'Edit Ukuran Standar'
                  : 'Tambah Ukuran Standar Baru'}
              </Text>

              <View style={styles.dimRow}>
                <View style={styles.dimCol}>
                  <Text style={styles.dimLabel}>Tebal (cm) *</Text>
                  <TextInput
                    style={styles.dimInput}
                    value={sizeThickness}
                    onChangeText={setSizeThickness}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.dimCol}>
                  <Text style={styles.dimLabel}>Lebar (cm) *</Text>
                  <TextInput
                    style={styles.dimInput}
                    value={sizeWidth}
                    onChangeText={setSizeWidth}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.dimCol}>
                  <Text style={styles.dimLabel}>Panjang (cm) *</Text>
                  <TextInput
                    style={styles.dimInput}
                    value={sizeLength}
                    onChangeText={setSizeLength}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Panjang Cepat (cm)</Text>
              <ChipSelector
                options={LENGTH_PRESETS_CM.map((p) => ({
                  label: `${p} cm (${p / 100}m)`,
                  value: p,
                }))}
                value={parsedL}
                onChange={(val) => setSizeLength(String(val))}
              />

              <Text style={styles.fieldLabel}>
                Label Tombol Ukuran (Opsional)
              </Text>
              <TextInput
                style={styles.textInput}
                value={sizeLabel}
                onChangeText={setSizeLabel}
                placeholder={`Otomatis: ${
                  parsedT > 0 && parsedW > 0 ? `${parsedT}×${parsedW}` : '6×12'
                } — atau ketik mis. 3×25 (Papan)`}
                placeholderTextColor={COLORS.textMuted}
              />

              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>Tampilan di tombol pilih:</Text>
                <Text style={styles.previewValue}>
                  {previewSizeLabel} • Panjang {parsedL > 0 ? `${parsedL} cm` : '-'}
                </Text>
              </View>

              <View style={styles.modalActions}>
                <PrimaryButton
                  title="Batal"
                  variant="outline"
                  onPress={() => setSizeModalOpen(false)}
                  disabled={submitting}
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  title="Simpan"
                  variant="ocean"
                  loading={submitting}
                  onPress={() => void handleSaveSize()}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={deleteWoodTarget !== null}
        title={`Hapus Jenis Kayu "${deleteWoodTarget?.name ?? ''}"?`}
        message="Jenis kayu ini akan dihapus dari daftar pilihan cepat. Catatan nota dan stok yang sudah pernah dibuat tetap aman."
        confirmLabel="Ya, Hapus"
        danger
        loading={submitting}
        onConfirm={() => void handleConfirmDeleteWood()}
        onCancel={() => setDeleteWoodTarget(null)}
      />

      <ConfirmModal
        visible={deleteSizeTarget !== null}
        title={`Hapus Ukuran "${deleteSizeTarget?.label ?? ''}"?`}
        message="Ukuran ini akan dihapus dari daftar tombol cepat. Nota penjualan dan stok yang sudah tercatat tidak terpengaruh."
        confirmLabel="Ya, Hapus"
        danger
        loading={submitting}
        onConfirm={() => void handleConfirmDeleteSize()}
        onCancel={() => setDeleteSizeTarget(null)}
      />
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
    gap: 14,
    paddingBottom: 36,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  sectionWrap: {
    gap: 12,
  },
  woodCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZING.radiusXl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
    ...SHADOWS.card,
  },
  woodCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.subhead,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
  },
  cardMeta: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  priceGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SIZING.radiusMd,
    padding: 12,
    gap: 10,
  },
  priceCol: {
    flex: 1,
    gap: 2,
  },
  priceGridLabel: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.textMuted,
  },
  priceBuyVal: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  priceSellVal: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.extraBold,
    color: COLORS.navy,
    fontVariant: ['tabular-nums'],
  },
  priceDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.borderStrong,
  },
  marginStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  marginLabel: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  marginValue: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.extraBold,
    fontVariant: ['tabular-nums'],
  },
  marketPriceBtn: {
    minHeight: 46,
    borderRadius: SIZING.radiusPill,
    backgroundColor: COLORS.navyLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  marketPriceBtnText: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.bold,
    color: COLORS.navy,
  },
  sizeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZING.radiusXl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 10,
    ...SHADOWS.card,
  },
  sizeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.oceanLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: SIZING.radiusMd,
    paddingHorizontal: 14,
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paletteItem: {
    width: '22%',
    alignItems: 'center',
    gap: 4,
  },
  paletteCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paletteCircleSelected: {
    backgroundColor: COLORS.charcoal,
  },
  paletteDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  paletteLabel: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  paletteLabelSelected: {
    fontFamily: FONTS.extraBold,
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
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: SIZING.radiusMd,
    paddingHorizontal: 10,
    fontSize: TYPOGRAPHY.subhead,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  previewBox: {
    backgroundColor: COLORS.navyLight,
    borderRadius: SIZING.radiusMd,
    padding: 12,
    gap: 2,
  },
  previewLabel: {
    fontSize: TYPOGRAPHY.caption,
    fontFamily: FONTS.semiBold,
    color: COLORS.ocean,
  },
  previewValue: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.extraBold,
    color: COLORS.navy,
    fontVariant: ['tabular-nums'],
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
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
});
