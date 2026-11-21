import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipSelector } from '../../components/ui/ChipSelector';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { WoodSwatchBadge } from '../../components/ui/WoodSwatchBadge';
import {
  createWoodSupplier,
  deleteWoodSupplier,
  listWoodSuppliers,
  updateWoodSupplier,
} from '../../db/suppliersRepo';
import { listWoodTypes } from '../../db/woodPresetsRepo';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, FONTS, SHADOWS, SIZING, TYPOGRAPHY } from '../../theme/tokens';
import {
  SaveWoodSupplierItemInput,
  WoodSupplierWithPrices,
  WoodTypePreset,
} from '../../types/domain';
import { formatDateTimeIndo, formatRupiah } from '../../utils/formatters';
import {
  findLowestPriceByWoodType,
  normalizeWhatsAppPhone,
} from '../../utils/supplierHelpers';

interface DraftSupplierWoodRow extends SaveWoodSupplierItemInput {
  localKey: string;
}

function createDraftRow(defaultWoodType = 'Jati', defaultPrice = 0): DraftSupplierWoodRow {
  return {
    localKey: `${Date.now()}-${Math.random()}`,
    woodType: defaultWoodType,
    buyPriceM3: defaultPrice,
    unitNote: '',
  };
}

export default function WoodSuppliersScreen() {
  const dbRevision = useAppStore((s) => s.dbRevision);
  const bumpDbRevision = useAppStore((s) => s.bumpDbRevision);

  const [woodTypes, setWoodTypes] = useState<WoodTypePreset[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<WoodSupplierWithPrices[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<
    WoodSupplierWithPrices[]
  >([]);
  const [search, setSearch] = useState('');
  const [woodFilter, setWoodFilter] = useState('Semua');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] =
    useState<WoodSupplierWithPrices | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [draftItems, setDraftItems] = useState<DraftSupplierWoodRow[]>([]);
  const [deleteTarget, setDeleteTarget] =
    useState<WoodSupplierWithPrices | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [types, allRows, filteredRows] = await Promise.all([
        listWoodTypes(),
        listWoodSuppliers('', 'Semua'),
        listWoodSuppliers(search, woodFilter),
      ]);
      setWoodTypes(types);
      setAllSuppliers(allRows);
      setFilteredSuppliers(filteredRows);
    } catch {
      // ignore transient error
    }
  }, [search, woodFilter]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  useEffect(() => {
    void loadData();
  }, [dbRevision, loadData]);

  const woodColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of woodTypes) {
      map.set(w.name.trim().toLowerCase(), w.color_hex);
    }
    return map;
  }, [woodTypes]);

  const filterOptions = useMemo(() => {
    return [
      { label: 'Semua', value: 'Semua' },
      ...woodTypes.map((w) => ({ label: w.name, value: w.name })),
    ];
  }, [woodTypes]);

  const lowestPrices = useMemo(
    () => findLowestPriceByWoodType(allSuppliers),
    [allSuppliers]
  );

  const openAddModal = () => {
    const firstWood = woodTypes[0];
    setEditingSupplier(null);
    setSupplierName('');
    setLocation('');
    setPhone('');
    setNotes('');
    setDraftItems([
      createDraftRow(
        firstWood?.name ?? 'Jati',
        firstWood?.default_buy_price_m3 ?? 0
      ),
    ]);
    setModalOpen(true);
  };

  const openEditModal = (supplier: WoodSupplierWithPrices) => {
    setEditingSupplier(supplier);
    setSupplierName(supplier.supplier_name);
    setLocation(supplier.location);
    setPhone(supplier.phone);
    setNotes(supplier.notes);
    setDraftItems(
      supplier.items.length > 0
        ? supplier.items.map((item) => ({
            localKey: `${item.id}-${Math.random()}`,
            woodType: item.wood_type,
            buyPriceM3: item.buy_price_m3,
            unitNote: item.unit_note,
          }))
        : [createDraftRow(woodTypes[0]?.name ?? 'Jati', 0)]
    );
    setModalOpen(true);
  };

  const updateDraftRow = (
    localKey: string,
    patch: Partial<Omit<DraftSupplierWoodRow, 'localKey'>>
  ) => {
    setDraftItems((prev) =>
      prev.map((row) => (row.localKey === localKey ? { ...row, ...patch } : row))
    );
  };

  const removeDraftRow = (localKey: string) => {
    setDraftItems((prev) => prev.filter((row) => row.localKey !== localKey));
  };

  const handleSaveSupplier = async () => {
    setSubmitting(true);
    try {
      const payload = {
        supplierName,
        location,
        phone,
        notes,
        items: draftItems.map(({ localKey: _k, ...rest }) => rest),
      };
      if (editingSupplier) {
        await updateWoodSupplier(editingSupplier.id, payload);
      } else {
        await createWoodSupplier(payload);
      }
      setModalOpen(false);
      bumpDbRevision(true);
      await loadData();
    } catch (error) {
      Alert.alert(
        'Periksa Data Pemasok',
        error instanceof Error ? error.message : 'Gagal menyimpan data pemasok.'
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
      await deleteWoodSupplier(deleteTarget.id);
      setDeleteTarget(null);
      bumpDbRevision(true);
      await loadData();
    } catch (error) {
      Alert.alert(
        'Gagal Menghapus',
        error instanceof Error ? error.message : 'Coba lagi.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenWhatsApp = async (rawPhone: string) => {
    const wa = normalizeWhatsAppPhone(rawPhone);
    if (!wa) {
      return;
    }
    try {
      await Linking.openURL(`https://wa.me/${wa}`);
    } catch {
      Alert.alert('Gagal Membuka WhatsApp', 'Pastikan WhatsApp terpasang di HP ini.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.topSection}>
        <Text style={styles.subtitle}>
          Catat tempat ambil/kulakan kayu, harga beli per m³, dan jenis kayu apa
          saja yang tersedia agar mudah membandingkan harga termurah.
        </Text>

        <PrimaryButton
          title="+ Tambah Pemasok / Asal Kayu"
          variant="primary"
          onPress={openAddModal}
          icon={<Feather name="plus" size={19} color={COLORS.textOnDark} />}
        />

        <View style={styles.searchBox}>
          <Feather name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Cari nama pemasok, asal daerah, atau jenis kayu..."
            placeholderTextColor={COLORS.textMuted}
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ChipSelector
          options={filterOptions}
          value={woodFilter}
          onChange={setWoodFilter}
          scrollable
        />
      </View>

      <FlatList
        data={filteredSuppliers}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.supplierName}>{item.supplier_name}</Text>
                {item.location ? (
                  <View style={styles.metaRow}>
                    <Feather name="map-pin" size={13} color={COLORS.ocean} />
                    <Text style={styles.locationText}>{item.location}</Text>
                  </View>
                ) : null}
                <Text style={styles.updatedText}>
                  Diperbarui: {formatDateTimeIndo(item.updated_at)}
                </Text>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  activeOpacity={0.78}
                  onPress={() => openEditModal(item)}
                  style={styles.editIconBtn}
                  accessibilityLabel={`Edit ${item.supplier_name}`}
                >
                  <Feather name="edit-2" size={16} color={COLORS.ocean} />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.78}
                  onPress={() => setDeleteTarget(item)}
                  style={styles.deleteIconBtn}
                  accessibilityLabel={`Hapus ${item.supplier_name}`}
                >
                  <Feather name="trash-2" size={16} color={COLORS.red} />
                </TouchableOpacity>
              </View>
            </View>

            {item.notes ? <Text style={styles.notesText}>{item.notes}</Text> : null}

            <View style={styles.woodList}>
              {item.items.map((wood) => {
                const key = wood.wood_type.trim().toLowerCase();
                const lowest = lowestPrices[key];
                const isCheapest =
                  lowest !== undefined &&
                  wood.buy_price_m3 > 0 &&
                  wood.buy_price_m3 <= lowest;

                return (
                  <View key={wood.id} style={styles.woodPriceRow}>
                    <WoodSwatchBadge
                      woodType={wood.wood_type}
                      colorHex={woodColorMap.get(key)}
                      size={16}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={styles.woodRowTitleWrap}>
                        <Text style={styles.woodRowTitle}>{wood.wood_type}</Text>
                        {isCheapest ? (
                          <StatusBadge label="Termurah" tone="green" />
                        ) : null}
                      </View>
                      {wood.unit_note ? (
                        <Text style={styles.woodRowNote}>{wood.unit_note}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.woodRowPrice}>
                      {wood.buy_price_m3 > 0
                        ? `${formatRupiah(wood.buy_price_m3)}/m³`
                        : '-'}
                    </Text>
                  </View>
                );
              })}
            </View>

            {item.phone ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => void handleOpenWhatsApp(item.phone)}
                style={styles.waBtn}
              >
                <Feather name="message-circle" size={15} color={COLORS.green} />
                <Text style={styles.waBtnText}>
                  Hubungi WA: {item.phone}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Feather name="map-pin" size={32} color={COLORS.textMuted} />}
            title="Belum ada data asal / pemasok kayu"
            subtitle="Catat tempat kulakan kayu langganan beserta daftar jenis kayu dan harga per m³."
            action={
              <PrimaryButton
                title="+ Tambah Pemasok Pertama"
                onPress={openAddModal}
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
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <Text style={styles.modalTitle}>
                {editingSupplier
                  ? 'Edit Pemasok / Asal Kayu'
                  : 'Tambah Pemasok / Asal Kayu'}
              </Text>

              <Text style={styles.fieldLabel}>
                Nama Pemasok / Tempat Ambil Kayu *
              </Text>
              <TextInput
                style={styles.textInput}
                value={supplierName}
                onChangeText={setSupplierName}
                placeholder="Contoh: Sawmill Pak Karno / Hutan Rakyat Klaten"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.fieldLabel}>Asal Daerah / Alamat</Text>
              <TextInput
                style={styles.textInput}
                value={location}
                onChangeText={setLocation}
                placeholder="Contoh: Blora, Jawa Tengah"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.fieldLabel}>No. WhatsApp / Telepon</Text>
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Contoh: 081234567890"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.fieldLabel}>Catatan Tambahan (Opsional)</Text>
              <TextInput
                style={styles.textInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Contoh: Kayu kering oven, minimal ambil 2 kubik"
                placeholderTextColor={COLORS.textMuted}
              />

              <View style={styles.modalSectionHeader}>
                <Text style={styles.fieldLabel}>
                  Jenis Kayu &amp; Harga Beli dari Pemasok Ini *
                </Text>
                <TouchableOpacity
                  activeOpacity={0.78}
                  onPress={() => {
                    setModalOpen(false);
                    router.push('/settings/wood-presets?tab=wood');
                  }}
                >
                  <Text style={styles.modalManageLink}>Atur Jenis Kayu</Text>
                </TouchableOpacity>
              </View>

              {draftItems.map((row, idx) => (
                <View key={row.localKey} style={styles.draftItemBox}>
                  <View style={styles.draftItemHeader}>
                    <Text style={styles.draftItemTitle}>
                      Kayu #{idx + 1}
                    </Text>
                    {draftItems.length > 1 ? (
                      <TouchableOpacity
                        onPress={() => removeDraftRow(row.localKey)}
                        style={styles.removeRowBtn}
                      >
                        <Feather name="trash-2" size={14} color={COLORS.red} />
                        <Text style={styles.removeRowText}>Hapus</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <ChipSelector
                    options={woodTypes.map((w) => ({
                      label: w.name,
                      value: w.name,
                    }))}
                    value={
                      woodTypes.find(
                        (w) =>
                          w.name.toLowerCase() ===
                          row.woodType.trim().toLowerCase()
                      )?.name ?? ''
                    }
                    onChange={(name) => {
                      const found = woodTypes.find((w) => w.name === name);
                      updateDraftRow(row.localKey, {
                        woodType: name,
                        buyPriceM3:
                          row.buyPriceM3 > 0
                            ? row.buyPriceM3
                            : found?.default_buy_price_m3 ?? 0,
                      });
                    }}
                    scrollable
                  />

                  <TextInput
                    style={styles.textInput}
                    value={row.woodType}
                    onChangeText={(val) =>
                      updateDraftRow(row.localKey, { woodType: val })
                    }
                    placeholder="Atau ketik jenis kayu..."
                    placeholderTextColor={COLORS.textMuted}
                  />

                  <MoneyInput
                    label="Harga Beli per m³ dari Pemasok Ini"
                    value={row.buyPriceM3}
                    onChangeValue={(amt) =>
                      updateDraftRow(row.localKey, { buyPriceM3: amt })
                    }
                  />

                  <TextInput
                    style={styles.textInput}
                    value={row.unitNote ?? ''}
                    onChangeText={(val) =>
                      updateDraftRow(row.localKey, { unitNote: val })
                    }
                    placeholder="Bentuk/ukuran tersedia (mis. Balok 6×12 / Papan)"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              ))}

              <PrimaryButton
                title="+ Tambah Jenis Kayu Lain di Pemasok Ini"
                variant="outline"
                onPress={() =>
                  setDraftItems((prev) => [
                    ...prev,
                    createDraftRow(woodTypes[0]?.name ?? 'Jati', 0),
                  ])
                }
                icon={<Feather name="plus-circle" size={18} color={COLORS.ocean} />}
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
                  title="Simpan Pemasok"
                  variant="primary"
                  loading={submitting}
                  onPress={() => void handleSaveSupplier()}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={deleteTarget !== null}
        title={`Hapus Pemasok "${deleteTarget?.supplier_name ?? ''}"?`}
        message="Catatan tempat asal dan daftar harga kayu dari pemasok ini akan dihapus permanen. Data stok di gudang tidak ikut terhapus."
        confirmLabel="Ya, Hapus"
        danger
        loading={submitting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
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
  subtitle: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  searchBox: {
    minHeight: SIZING.inputMinHeight,
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
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
    paddingVertical: 8,
  },
  listContent: {
    padding: 18,
    paddingTop: 6,
    gap: 12,
    paddingBottom: 36,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZING.radiusXl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
    ...SHADOWS.card,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  supplierName: {
    fontSize: TYPOGRAPHY.subhead,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  locationText: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.bold,
    color: COLORS.ocean,
  },
  updatedText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
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
  notesText: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  woodList: {
    gap: 8,
  },
  woodPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SIZING.radiusMd,
    padding: 11,
  },
  woodRowTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  woodRowTitle: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  woodRowNote: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  woodRowPrice: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.extraBold,
    color: COLORS.navy,
    fontVariant: ['tabular-nums'],
  },
  waBtn: {
    minHeight: 44,
    borderRadius: SIZING.radiusPill,
    backgroundColor: COLORS.greenLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  waBtnText: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.bold,
    color: COLORS.green,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '92%',
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
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  modalManageLink: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.ocean,
  },
  draftItemBox: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SIZING.radiusLg,
    padding: 12,
    gap: 10,
  },
  draftItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  draftItemTitle: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.extraBold,
    color: COLORS.navy,
  },
  removeRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SIZING.radiusPill,
    backgroundColor: COLORS.redLight,
  },
  removeRowText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.red,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
});
