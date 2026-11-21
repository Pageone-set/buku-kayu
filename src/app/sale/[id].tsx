import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SectionCard } from '../../components/ui/SectionCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { addWoodSalePayment, getWoodSaleDetail } from '../../db/salesRepo';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, FONTS, SIZING, TYPOGRAPHY } from '../../theme/tokens';
import { WoodSaleDetail } from '../../types/domain';
import { calculateRemainingAmount } from '../../utils/cubicCalculator';
import {
  formatDateTimeIndo,
  formatDimension,
  formatRupiah,
  formatVolumeM3,
} from '../../utils/formatters';
import {
  buildWoodSaleReceiptHtml,
  buildWoodSaleWhatsAppText,
} from '../../utils/receiptGenerator';
import { shareHtmlAsPdf, shareTextToWhatsApp } from '../../utils/shareReceipt';

export default function WoodSaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const saleId = Number(id);
  const workshopName = useAppStore((s) => s.workshopName);
  const dbRevision = useAppStore((s) => s.dbRevision);
  const bumpDbRevision = useAppStore((s) => s.bumpDbRevision);

  const [sale, setSale] = useState<WoodSaleDetail | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payNote, setPayNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!Number.isFinite(saleId) || saleId <= 0) {
      return;
    }
    const detail = await getWoodSaleDetail(saleId);
    setSale(detail);
  }, [saleId]);

  useFocusEffect(
    useCallback(() => {
      void loadDetail();
    }, [loadDetail])
  );

  useEffect(() => {
    void loadDetail();
  }, [dbRevision, loadDetail]);

  if (!sale) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Memuat detail nota...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const remaining = calculateRemainingAmount(sale.total_amount, sale.paid_amount);
  const isPaid = sale.payment_status === 'PAID' && remaining === 0;

  const openPayModal = () => {
    setPayAmount(remaining);
    setPayNote('');
    setPayModalOpen(true);
  };

  const handleSavePayment = async () => {
    setSubmitting(true);
    try {
      await addWoodSalePayment(sale.id, payAmount, payNote);
      setPayModalOpen(false);
      bumpDbRevision(true);
      await loadDetail();
    } catch (error) {
      Alert.alert(
        'Gagal Menyimpan Pembayaran',
        error instanceof Error ? error.message : 'Periksa nominal bayar.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      const text = buildWoodSaleWhatsAppText(sale, workshopName);
      await shareTextToWhatsApp(text, sale.customer_phone);
    } catch {
      Alert.alert('Gagal Membagikan', 'Tidak dapat membuka WhatsApp di HP ini.');
    }
  };

  const handleSharePdf = async () => {
    try {
      const html = buildWoodSaleReceiptHtml(sale, workshopName);
      const fileName = `Nota_${sale.invoice_number}${
        sale.customer_name ? `_${sale.customer_name}` : ''
      }`;
      await shareHtmlAsPdf(html, `Nota ${sale.invoice_number}`, fileName);
    } catch {
      Alert.alert('Gagal Membuat PDF', 'Terjadi kendala saat membuat nota PDF.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <SectionCard>
          <View style={styles.topHeader}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.invoiceNo}>{sale.invoice_number}</Text>
              <Text style={styles.buyerName}>{sale.customer_name}</Text>
              {sale.customer_phone ? (
                <Text style={styles.metaText}>WA: {sale.customer_phone}</Text>
              ) : null}
              <Text style={styles.metaText}>
                {formatDateTimeIndo(sale.created_at)}
              </Text>
            </View>
            <StatusBadge
              label={isPaid ? 'LUNAS' : 'KASBON'}
              tone={isPaid ? 'green' : 'red'}
            />
          </View>

          <View style={styles.amountSummary}>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Total Kubikasi</Text>
              <Text style={styles.amountVal}>
                {formatVolumeM3(sale.total_volume_m3)}
              </Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Total Harga</Text>
              <Text style={styles.amountVal}>
                {formatRupiah(sale.total_amount)}
              </Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Sudah Dibayar</Text>
              <Text style={[styles.amountVal, { color: COLORS.green }]}>
                {formatRupiah(sale.paid_amount)}
              </Text>
            </View>
            {!isPaid ? (
              <View style={[styles.amountRow, styles.remainingRow]}>
                <Text style={[styles.amountLabel, { color: COLORS.red }]}>
                  Kurang Bayar
                </Text>
                <Text style={styles.remainingVal}>
                  {formatRupiah(remaining)}
                </Text>
              </View>
            ) : null}
          </View>

          {sale.notes ? (
            <Text style={styles.notesText}>Catatan: {sale.notes}</Text>
          ) : null}

          {!isPaid ? (
            <PrimaryButton
              title="+ Catat Bayar Kasbon"
              variant="success"
              size="lg"
              onPress={openPayModal}
              icon={
                <MaterialCommunityIcons
                  name="cash-check"
                  size={22}
                  color={COLORS.textOnDark}
                />
              }
            />
          ) : null}
        </SectionCard>

        <SectionCard title="Bagikan Nota ke Pembeli">
          <PrimaryButton
            title="Kirim Nota ke WhatsApp (Teks)"
            variant="success"
            onPress={() => void handleShareWhatsApp()}
            icon={
              <MaterialCommunityIcons
                name="whatsapp"
                size={22}
                color={COLORS.textOnDark}
              />
            }
          />
          <PrimaryButton
            title="Cetak / Kirim Nota PDF"
            variant="outline"
            onPress={() => void handleSharePdf()}
            icon={
              <MaterialCommunityIcons
                name="file-pdf-box"
                size={22}
                color={COLORS.red}
              />
            }
          />
        </SectionCard>

        <SectionCard title={`Rincian Kayu (${sale.items.length} item)`}>
          {sale.items.map((item, idx) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.itemTitle}>
                  {idx + 1}. {item.wood_type} (
                  {formatDimension(
                    item.length_cm,
                    item.width_cm,
                    item.thickness_cm
                  )}
                  )
                </Text>
                <Text style={styles.itemSub}>
                  {item.qty} btg • {formatVolumeM3(item.volume_m3)} ×{' '}
                  {formatRupiah(item.price_per_m3)}/m³
                </Text>
              </View>
              <Text style={styles.itemSubtotal}>
                {formatRupiah(item.subtotal)}
              </Text>
            </View>
          ))}
        </SectionCard>

        <SectionCard title="Riwayat Pembayaran">
          {sale.payments.length === 0 ? (
            <Text style={styles.metaText}>Belum ada uang masuk untuk nota ini.</Text>
          ) : (
            sale.payments.map((pay) => (
              <View key={pay.id} style={styles.paymentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentNote}>
                    {pay.note || 'Pembayaran'}
                  </Text>
                  <Text style={styles.metaText}>
                    {formatDateTimeIndo(pay.payment_date)}
                  </Text>
                </View>
                <Text style={styles.paymentAmt}>
                  {formatRupiah(pay.amount)}
                </Text>
              </View>
            ))
          )}
        </SectionCard>
      </ScrollView>

      <Modal
        visible={payModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPayModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Catat Bayar Kasbon</Text>
            <Text style={styles.metaText}>
              Sisa kurang bayar: {formatRupiah(remaining)}
            </Text>

            <MoneyInput
              label="Nominal Diterima"
              value={payAmount}
              onChangeValue={setPayAmount}
            />

            <PrimaryButton
              title={`Isi Lunas (${formatRupiah(remaining)})`}
              variant="outline"
              onPress={() => setPayAmount(remaining)}
            />

            <Text style={styles.fieldLabel}>Catatan (Opsional)</Text>
            <TextInput
              style={styles.textInput}
              value={payNote}
              onChangeText={setPayNote}
              placeholder="Contoh: Transfer BCA / Tunai di bengkel"
              placeholderTextColor={COLORS.textMuted}
            />

            <View style={styles.modalActions}>
              <PrimaryButton
                title="Batal"
                variant="outline"
                onPress={() => setPayModalOpen(false)}
                disabled={submitting}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                title="Simpan Bayar"
                variant="success"
                loading={submitting}
                onPress={() => void handleSavePayment()}
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
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
  },
  container: {
    padding: SIZING.spacingMd,
    gap: 14,
    paddingBottom: 32,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  invoiceNo: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.extraBold,
    color: COLORS.ocean,
  },
  buyerName: {
    fontSize: TYPOGRAPHY.title,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
  },
  metaText: {
    fontSize: TYPOGRAPHY.label,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  amountSummary: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SIZING.radiusMd,
    padding: 12,
    gap: 8,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: TYPOGRAPHY.body,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  amountVal: {
    fontSize: TYPOGRAPHY.subhead,
    fontFamily: FONTS.extraBold,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  remainingRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  remainingVal: {
    fontSize: TYPOGRAPHY.amountMd,
    fontFamily: FONTS.extraBold,
    color: COLORS.red,
    fontVariant: ['tabular-nums'],
  },
  notesText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceSubtle,
    paddingBottom: 10,
    gap: 10,
  },
  itemTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemSub: {
    fontSize: TYPOGRAPHY.label,
    color: COLORS.textSecondary,
  },
  itemSubtotal: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceSubtle,
    paddingBottom: 8,
    gap: 10,
  },
  paymentNote: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  paymentAmt: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
    color: COLORS.green,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
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
