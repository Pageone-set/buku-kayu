import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OrderStatusStepper } from '../../components/domain/OrderStatusStepper';
import { ChipSelector } from '../../components/ui/ChipSelector';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SectionCard } from '../../components/ui/SectionCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  addFurnitureCost,
  addFurniturePayment,
  getFurnitureOrderDetail,
  updateFurnitureOrderStatus,
} from '../../db/ordersRepo';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, SIZING, TYPOGRAPHY } from '../../theme/tokens';
import {
  FURNITURE_COST_CATEGORY_LABELS,
  FURNITURE_PAYMENT_TYPE_LABELS,
  FURNITURE_STATUS_LABELS,
  FurnitureCostCategory,
  FurnitureOrderDetail,
  FurnitureOrderStatus,
  FurniturePaymentType,
} from '../../types/domain';
import {
  calculateFurnitureNetEstimate,
  calculateRemainingAmount,
} from '../../utils/cubicCalculator';
import { formatDateIndo, formatRupiah } from '../../utils/formatters';
import {
  buildFurnitureOrderReceiptHtml,
  buildFurnitureOrderWhatsAppText,
} from '../../utils/receiptGenerator';
import { shareHtmlAsPdf, shareTextToWhatsApp } from '../../utils/shareReceipt';

export default function FurnitureOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);

  const workshopName = useAppStore((s) => s.workshopName);
  const dbRevision = useAppStore((s) => s.dbRevision);
  const bumpDbRevision = useAppStore((s) => s.bumpDbRevision);

  const [order, setOrder] = useState<FurnitureOrderDetail | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payType, setPayType] = useState<FurniturePaymentType>('INSTALLMENT');
  const [payAmount, setPayAmount] = useState(0);
  const [payNote, setPayNote] = useState('');

  const [costModalOpen, setCostModalOpen] = useState(false);
  const [costCategory, setCostCategory] = useState<FurnitureCostCategory>('WOOD');
  const [costDesc, setCostDesc] = useState('');
  const [costAmount, setCostAmount] = useState(0);
  const [recordCostInCash, setRecordCostInCash] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return;
    }
    const detail = await getFurnitureOrderDetail(orderId);
    setOrder(detail);
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      void loadDetail();
    }, [loadDetail])
  );

  useEffect(() => {
    void loadDetail();
  }, [dbRevision, loadDetail]);

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <Text style={styles.metaText}>Memuat detail orderan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const remaining = calculateRemainingAmount(order.total_price, order.paid_amount);
  const netEstimate = calculateFurnitureNetEstimate(
    order.total_price,
    order.production_cost
  );
  const isPaid = remaining === 0;

  const handleStatusChange = async (nextStatus: FurnitureOrderStatus) => {
    setUpdatingStatus(true);
    try {
      await updateFurnitureOrderStatus(order.id, nextStatus);
      bumpDbRevision(true);
      await loadDetail();
    } catch (error) {
      Alert.alert(
        'Gagal Ubah Status',
        error instanceof Error ? error.message : 'Coba lagi.'
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openPayModal = () => {
    setPayType(order.paid_amount === 0 ? 'DP' : 'INSTALLMENT');
    setPayAmount(remaining);
    setPayNote('');
    setPayModalOpen(true);
  };

  const handleSavePayment = async () => {
    setSubmitting(true);
    try {
      await addFurniturePayment(order.id, payAmount, payType, payNote);
      setPayModalOpen(false);
      bumpDbRevision(true);
      await loadDetail();
    } catch (error) {
      Alert.alert(
        'Gagal Simpan Pembayaran',
        error instanceof Error ? error.message : 'Periksa nominal.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openCostModal = () => {
    setCostCategory('WOOD');
    setCostDesc('');
    setCostAmount(0);
    setRecordCostInCash(true);
    setCostModalOpen(true);
  };

  const handleSaveCost = async () => {
    setSubmitting(true);
    try {
      await addFurnitureCost(
        order.id,
        costCategory,
        costDesc,
        costAmount,
        recordCostInCash
      );
      setCostModalOpen(false);
      bumpDbRevision(true);
      await loadDetail();
    } catch (error) {
      Alert.alert(
        'Gagal Simpan Biaya',
        error instanceof Error ? error.message : 'Periksa isian biaya.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      const text = buildFurnitureOrderWhatsAppText(order, workshopName);
      await shareTextToWhatsApp(text, order.customer_phone);
    } catch {
      Alert.alert('Gagal Membagikan', 'Tidak dapat membuka WhatsApp di HP ini.');
    }
  };

  const handleSharePdf = async () => {
    try {
      const html = buildFurnitureOrderReceiptHtml(order, workshopName);
      await shareHtmlAsPdf(html, `Order ${order.order_code}`);
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
              <Text style={styles.orderCode}>{order.order_code}</Text>
              <Text style={styles.itemTitle}>{order.item_name}</Text>
              <Text style={styles.customerName}>{order.customer_name}</Text>
              {order.customer_phone ? (
                <Text style={styles.metaText}>WA: {order.customer_phone}</Text>
              ) : null}
              <Text style={styles.metaText}>
                Target Selesai: {formatDateIndo(order.deadline_date)}
              </Text>
            </View>
            <StatusBadge
              label={FURNITURE_STATUS_LABELS[order.status]}
              tone={order.status === 'COMPLETED' ? 'green' : 'amber'}
            />
          </View>

          <View style={styles.financeGrid}>
            <View style={styles.finRow}>
              <Text style={styles.finLabel}>Harga Jual Total</Text>
              <Text style={styles.finVal}>{formatRupiah(order.total_price)}</Text>
            </View>
            <View style={styles.finRow}>
              <Text style={styles.finLabel}>Sudah Dibayar Pelanggan</Text>
              <Text style={[styles.finVal, { color: COLORS.green }]}>
                {formatRupiah(order.paid_amount)}
              </Text>
            </View>
            <View style={styles.finRow}>
              <Text style={styles.finLabel}>Sisa Tagihan</Text>
              <Text
                style={[
                  styles.finVal,
                  { color: isPaid ? COLORS.green : COLORS.red },
                ]}
              >
                {isPaid ? 'LUNAS' : formatRupiah(remaining)}
              </Text>
            </View>
            <View style={styles.finDivider} />
            <View style={styles.finRow}>
              <Text style={styles.finLabel}>Total Biaya Pengerjaan</Text>
              <Text style={styles.finVal}>
                {formatRupiah(order.production_cost)}
              </Text>
            </View>
            <View style={styles.finRow}>
              <Text style={[styles.finLabel, { fontWeight: '800' }]}>
                Perkiraan Untung Bersih
              </Text>
              <Text
                style={[
                  styles.netEstimateVal,
                  { color: netEstimate >= 0 ? COLORS.green : COLORS.red },
                ]}
              >
                {formatRupiah(netEstimate)}
              </Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard title="Tahap Pengerjaan">
          <OrderStatusStepper
            currentStatus={order.status}
            onSelectStatus={(s) => void handleStatusChange(s)}
            updating={updatingStatus}
          />
        </SectionCard>

        <SectionCard
          title="Pembayaran Pelanggan"
          rightElement={
            !isPaid ? (
              <StatusBadge label="Belum Lunas" tone="red" />
            ) : (
              <StatusBadge label="Lunas" tone="green" />
            )
          }
        >
          {!isPaid ? (
            <PrimaryButton
              title="+ Catat Pembayaran (DP / Cicilan / Lunas)"
              variant="success"
              onPress={openPayModal}
            />
          ) : null}

          {order.payments.length === 0 ? (
            <Text style={styles.metaText}>Belum ada pembayaran masuk.</Text>
          ) : (
            order.payments.map((pay) => (
              <View key={pay.id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle}>
                    {FURNITURE_PAYMENT_TYPE_LABELS[pay.payment_type]}
                  </Text>
                  <Text style={styles.metaText}>
                    {formatDateIndo(pay.payment_date)}
                    {pay.note ? ` • ${pay.note}` : ''}
                  </Text>
                </View>
                <Text style={[styles.historyAmt, { color: COLORS.green }]}>
                  +{formatRupiah(pay.amount)}
                </Text>
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard title="Biaya Pengerjaan Order Ini">
          <PrimaryButton
            title="+ Tambah Biaya (Kayu / Tukang / Cat)"
            variant="outline"
            onPress={openCostModal}
          />

          {order.costs.length === 0 ? (
            <Text style={styles.metaText}>
              Belum ada biaya pengerjaan dicatat untuk order ini.
            </Text>
          ) : (
            order.costs.map((cost) => (
              <View key={cost.id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle}>{cost.description}</Text>
                  <Text style={styles.metaText}>
                    {FURNITURE_COST_CATEGORY_LABELS[cost.cost_category]} •{' '}
                    {formatDateIndo(cost.created_at)}
                  </Text>
                </View>
                <Text style={[styles.historyAmt, { color: COLORS.red }]}>
                  -{formatRupiah(cost.amount)}
                </Text>
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard title="Bagikan Nota Orderan">
          <PrimaryButton
            title="Kirim Ringkasan ke WhatsApp"
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
      </ScrollView>

      <Modal
        visible={payModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPayModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Catat Pembayaran Orderan</Text>
            <Text style={styles.metaText}>
              Sisa tagihan: {formatRupiah(remaining)}
            </Text>

            <ChipSelector
              options={[
                { label: 'DP Awal', value: 'DP' as FurniturePaymentType },
                { label: 'Cicilan', value: 'INSTALLMENT' as FurniturePaymentType },
                { label: 'Pelunasan', value: 'FINAL' as FurniturePaymentType },
              ]}
              value={payType}
              onChange={(val) => {
                setPayType(val);
                if (val === 'FINAL') {
                  setPayAmount(remaining);
                }
              }}
            />

            <MoneyInput
              label="Nominal Pembayaran"
              value={payAmount}
              onChangeValue={setPayAmount}
            />

            <PrimaryButton
              title={`Isi Lunas (${formatRupiah(remaining)})`}
              variant="outline"
              onPress={() => {
                setPayType('FINAL');
                setPayAmount(remaining);
              }}
            />

            <Text style={styles.fieldLabel}>Catatan (Opsional)</Text>
            <TextInput
              style={styles.textInput}
              value={payNote}
              onChangeText={setPayNote}
              placeholder="Contoh: Transfer BCA / Tunai"
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
                title="Simpan"
                variant="success"
                loading={submitting}
                onPress={() => void handleSavePayment()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={costModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCostModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Tambah Biaya Pengerjaan</Text>

            <ChipSelector
              options={[
                { label: 'Kayu Terpakai', value: 'WOOD' as FurnitureCostCategory },
                { label: 'Upah Tukang', value: 'LABOR' as FurnitureCostCategory },
                {
                  label: 'Aksesoris / Cat / Plitur',
                  value: 'ACCESSORIES' as FurnitureCostCategory,
                },
              ]}
              value={costCategory}
              onChange={setCostCategory}
            />

            <Text style={styles.fieldLabel}>Keterangan Biaya *</Text>
            <TextInput
              style={styles.textInput}
              value={costDesc}
              onChangeText={setCostDesc}
              placeholder="Contoh: Upah Pak Slamet / Plitur & Engsel"
              placeholderTextColor={COLORS.textMuted}
            />

            <MoneyInput
              label="Nominal Biaya *"
              value={costAmount}
              onChangeValue={setCostAmount}
            />

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>
                  Catat juga di Uang Keluar Kas
                </Text>
                <Text style={styles.metaText}>
                  Matikan jika memakai kayu dari stok yang sudah dibeli sebelumnya
                </Text>
              </View>
              <Switch
                value={recordCostInCash}
                onValueChange={setRecordCostInCash}
                trackColor={{ false: COLORS.border, true: COLORS.amberBorder }}
                thumbColor={recordCostInCash ? COLORS.amber : '#F4F4F5'}
              />
            </View>

            <View style={styles.modalActions}>
              <PrimaryButton
                title="Batal"
                variant="outline"
                onPress={() => setCostModalOpen(false)}
                disabled={submitting}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                title="Simpan Biaya"
                variant="primary"
                loading={submitting}
                onPress={() => void handleSaveCost()}
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
  orderCode: {
    fontSize: TYPOGRAPHY.label,
    fontWeight: '800',
    color: COLORS.amberDark,
  },
  itemTitle: {
    fontSize: TYPOGRAPHY.title,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  customerName: {
    fontSize: TYPOGRAPHY.subhead,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  metaText: {
    fontSize: TYPOGRAPHY.label,
    color: COLORS.textMuted,
  },
  financeGrid: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SIZING.radiusMd,
    padding: 12,
    gap: 8,
  },
  finRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finLabel: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  finVal: {
    fontSize: TYPOGRAPHY.subhead,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  finDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 2,
  },
  netEstimateVal: {
    fontSize: TYPOGRAPHY.amountMd,
    fontWeight: '800',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceSubtle,
    paddingBottom: 8,
    gap: 10,
  },
  historyTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  historyAmt: {
    fontSize: TYPOGRAPHY.body,
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
