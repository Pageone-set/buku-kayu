import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipSelector } from '../../components/ui/ChipSelector';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SectionCard } from '../../components/ui/SectionCard';
import { createFurnitureOrder } from '../../db/ordersRepo';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, SIZING, TYPOGRAPHY } from '../../theme/tokens';
import { calculateRemainingAmount } from '../../utils/cubicCalculator';
import {
  formatDateIndo,
  formatRupiah,
  getOffsetDateString,
} from '../../utils/formatters';

export default function NewFurnitureOrderScreen() {
  const bumpDbRevision = useAppStore((s) => s.bumpDbRevision);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [itemName, setItemName] = useState('');
  const [deadlineDaysPreset, setDeadlineDaysPreset] = useState<number>(14);
  const [deadlineDate, setDeadlineDate] = useState<string>(
    getOffsetDateString(14)
  );
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [initialDp, setInitialDp] = useState<number>(0);
  const [dpNote, setDpNote] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const remaining = calculateRemainingAmount(totalPrice, initialDp);

  const handleSave = async () => {
    if (!customerName.trim()) {
      Alert.alert('Periksa Isian', 'Nama pelanggan wajib diisi.');
      return;
    }
    if (!itemName.trim()) {
      Alert.alert('Periksa Isian', 'Nama barang pesanan wajib diisi.');
      return;
    }
    if (totalPrice <= 0) {
      Alert.alert('Periksa Harga', 'Harga jual total harus lebih dari Rp 0.');
      return;
    }
    if (initialDp > totalPrice) {
      Alert.alert('Periksa DP', 'DP awal tidak boleh melebihi harga total.');
      return;
    }

    setSaving(true);
    try {
      const orderId = await createFurnitureOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        itemName: itemName.trim(),
        totalPrice,
        initialDp,
        deadlineDate: deadlineDate.trim() || getOffsetDateString(14),
        dpNote: dpNote.trim(),
      });
      bumpDbRevision(true);
      router.replace(`/order/${orderId}`);
    } catch (error) {
      Alert.alert(
        'Gagal Menyimpan Orderan',
        error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <SectionCard title="1. Data Pelanggan & Pesanan">
          <Text style={styles.fieldLabel}>Nama Pelanggan *</Text>
          <TextInput
            style={styles.textInput}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Contoh: Ibu Sari / Pak Hendra"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.fieldLabel}>No. WhatsApp Pelanggan</Text>
          <TextInput
            style={styles.textInput}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
            placeholder="Contoh: 081234567890"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.fieldLabel}>Nama Barang / Pesanan *</Text>
          <TextInput
            style={styles.textInput}
            value={itemName}
            onChangeText={setItemName}
            placeholder="Contoh: Kusen Pintu Jati 2 Set"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.fieldLabel}>Perkiraan Selesai</Text>
          <ChipSelector
            options={[
              { label: '+7 Hari', value: 7 },
              { label: '+14 Hari', value: 14 },
              { label: '+30 Hari', value: 30 },
            ]}
            value={deadlineDaysPreset}
            onChange={(days) => {
              setDeadlineDaysPreset(days);
              setDeadlineDate(getOffsetDateString(days));
            }}
          />

          <TextInput
            style={styles.textInput}
            value={deadlineDate}
            onChangeText={setDeadlineDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textMuted}
          />
          <Text style={styles.helperText}>
            Target selesai: {formatDateIndo(deadlineDate)}
          </Text>
        </SectionCard>

        <SectionCard title="2. Harga & Pembayaran Awal">
          <MoneyInput
            label="Harga Jual Total *"
            value={totalPrice}
            onChangeValue={setTotalPrice}
          />

          <MoneyInput
            label="DP Awal yang Diterima (Opsional)"
            value={initialDp}
            onChangeValue={setInitialDp}
          />

          {totalPrice > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sisa Tagihan Pelanggan:</Text>
              <Text
                style={[
                  styles.summaryVal,
                  { color: remaining > 0 ? COLORS.red : COLORS.green },
                ]}
              >
                {remaining > 0 ? formatRupiah(remaining) : 'Lunas'}
              </Text>
            </View>
          ) : null}

          {initialDp > 0 ? (
            <>
              <Text style={styles.fieldLabel}>Catatan DP (Opsional)</Text>
              <TextInput
                style={styles.textInput}
                value={dpNote}
                onChangeText={setDpNote}
                placeholder="Contoh: Transfer BRI / Tunai"
                placeholderTextColor={COLORS.textMuted}
              />
            </>
          ) : null}
        </SectionCard>

        <PrimaryButton
          title="Simpan Orderan Furniture"
          size="lg"
          variant="success"
          loading={saving}
          onPress={() => void handleSave()}
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
    paddingBottom: 32,
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
  helperText: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.amberDark,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SIZING.radiusMd,
    padding: 12,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  summaryVal: {
    fontSize: TYPOGRAPHY.amountMd,
    fontWeight: '800',
  },
});
