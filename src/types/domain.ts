export type WoodPaymentStatus = 'PAID' | 'PARTIAL';

export interface WoodStock {
  id: number;
  wood_type: string;
  length_cm: number;
  width_cm: number;
  thickness_cm: number;
  stock_qty: number;
  buy_price_m3: number;
  sell_price_m3: number;
  updated_at: string;
}

export interface CreateWoodStockInput {
  woodType: string;
  lengthCm: number;
  widthCm: number;
  thicknessCm: number;
  stockQty: number;
  buyPriceM3: number;
  sellPriceM3: number;
  recordCashOut?: boolean;
}

export interface AdjustStockInput {
  id: number;
  deltaQty: number;
  buyPriceM3?: number;
  sellPriceM3?: number;
  recordCashOut?: boolean;
}

export interface WoodSale {
  id: number;
  invoice_number: string;
  customer_name: string;
  customer_phone: string;
  total_volume_m3: number;
  total_amount: number;
  paid_amount: number;
  payment_status: WoodPaymentStatus;
  notes: string;
  created_at: string;
}

export interface WoodSaleItem {
  id: number;
  sale_id: number;
  stock_id: number | null;
  wood_type: string;
  length_cm: number;
  width_cm: number;
  thickness_cm: number;
  qty: number;
  volume_m3: number;
  price_per_m3: number;
  subtotal: number;
}

export interface WoodSalePayment {
  id: number;
  sale_id: number;
  amount: number;
  payment_date: string;
  note: string;
}

export interface WoodSaleDetail extends WoodSale {
  items: WoodSaleItem[];
  payments: WoodSalePayment[];
}

export interface CreateWoodSaleItemInput {
  stockId: number | null;
  woodType: string;
  lengthCm: number;
  widthCm: number;
  thicknessCm: number;
  qty: number;
  pricePerM3: number;
}

export interface CreateWoodSaleInput {
  customerName: string;
  customerPhone: string;
  paymentStatus: WoodPaymentStatus;
  paidAmount: number;
  notes: string;
  items: CreateWoodSaleItemInput[];
}

export type FurnitureOrderStatus =
  | 'ORDERED'
  | 'ASSEMBLY'
  | 'FINISHING'
  | 'READY'
  | 'COMPLETED';

export type FurniturePaymentType = 'DP' | 'INSTALLMENT' | 'FINAL';

export type FurnitureCostCategory = 'WOOD' | 'LABOR' | 'ACCESSORIES';

export interface FurnitureOrder {
  id: number;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  item_name: string;
  total_price: number;
  paid_amount: number;
  production_cost: number;
  status: FurnitureOrderStatus;
  deadline_date: string;
  created_at: string;
}

export interface FurniturePayment {
  id: number;
  order_id: number;
  amount: number;
  payment_type: FurniturePaymentType;
  payment_date: string;
  note: string;
}

export interface FurnitureCost {
  id: number;
  order_id: number;
  cost_category: FurnitureCostCategory;
  description: string;
  amount: number;
  created_at: string;
}

export interface FurnitureOrderDetail extends FurnitureOrder {
  payments: FurniturePayment[];
  costs: FurnitureCost[];
}

export interface CreateFurnitureOrderInput {
  customerName: string;
  customerPhone: string;
  itemName: string;
  totalPrice: number;
  initialDp: number;
  deadlineDate: string;
  dpNote?: string;
}

export type CashFlowType = 'IN' | 'OUT';

export type CashFlowCategory =
  | 'WOOD_SALE'
  | 'FURNITURE_PAYMENT'
  | 'MATERIAL_BUY'
  | 'LABOR_WAGE'
  | 'OPERATIONAL'
  | 'PERSONAL_DRAW';

export interface CashFlow {
  id: number;
  type: CashFlowType;
  category: CashFlowCategory;
  amount: number;
  description: string;
  reference_id: string;
  created_at: string;
}

export interface CreateCashFlowInput {
  type: CashFlowType;
  category: CashFlowCategory;
  amount: number;
  description: string;
  referenceId?: string;
}

export interface DashboardSummary {
  todayIn: number;
  todayOut: number;
  totalUnpaidWoodSales: number;
  totalUnpaidFurniture: number;
  totalUnpaidAll: number;
  activeFurnitureOrdersCount: number;
  lowStockCount: number;
}

export interface CashFlowSummary {
  totalIn: number;
  businessOut: number;
  personalDrawOut: number;
  totalOut: number;
  businessNet: number;
  cashBalance: number;
}

export interface DriveBackupFileInfo {
  id: string;
  name: string;
  modifiedTime: string;
  size: number;
}

export type BackupSyncStatus = 'IDLE' | 'BACKING_UP' | 'RESTORING' | 'ERROR';

export interface GoogleUserProfile {
  id: string;
  name: string;
  email: string;
  photo: string | null;
}

export const WOOD_TYPE_PRESETS = ['Jati', 'Mahoni', 'Sengon', 'Kamper'] as const;

export interface DimensionPreset {
  label: string;
  thicknessCm: number;
  widthCm: number;
}

export const DIMENSION_PRESETS: readonly DimensionPreset[] = [
  { label: '6×12', thicknessCm: 6, widthCm: 12 },
  { label: '8×12', thicknessCm: 8, widthCm: 12 },
  { label: '5×10', thicknessCm: 5, widthCm: 10 },
  { label: '2×20 (Papan)', thicknessCm: 2, widthCm: 20 },
];

export const LENGTH_PRESETS_CM = [200, 300, 400] as const;

export interface FurnitureStatusStep {
  key: FurnitureOrderStatus;
  label: string;
  shortLabel: string;
}

export const FURNITURE_STATUS_STEPS: readonly FurnitureStatusStep[] = [
  { key: 'ORDERED', label: 'Baru Pesan', shortLabel: 'Pesan' },
  { key: 'ASSEMBLY', label: 'Potong & Rakit', shortLabel: 'Rakit' },
  { key: 'FINISHING', label: 'Finishing', shortLabel: 'Finishing' },
  { key: 'READY', label: 'Siap Kirim', shortLabel: 'Siap Kirim' },
  { key: 'COMPLETED', label: 'Selesai', shortLabel: 'Selesai' },
];

export const FURNITURE_STATUS_LABELS: Record<FurnitureOrderStatus, string> = {
  ORDERED: 'Baru Pesan',
  ASSEMBLY: 'Potong & Rakit',
  FINISHING: 'Finishing',
  READY: 'Siap Kirim',
  COMPLETED: 'Selesai',
};

export const FURNITURE_PAYMENT_TYPE_LABELS: Record<FurniturePaymentType, string> = {
  DP: 'DP Awal',
  INSTALLMENT: 'Cicilan',
  FINAL: 'Pelunasan',
};

export const FURNITURE_COST_CATEGORY_LABELS: Record<FurnitureCostCategory, string> = {
  WOOD: 'Kayu Terpakai',
  LABOR: 'Upah Tukang',
  ACCESSORIES: 'Aksesoris / Cat / Plitur',
};

export const CASH_FLOW_CATEGORY_LABELS: Record<CashFlowCategory, string> = {
  WOOD_SALE: 'Jual Kayu',
  FURNITURE_PAYMENT: 'Bayar Orderan Furniture',
  MATERIAL_BUY: 'Beli Kayu / Bahan',
  LABOR_WAGE: 'Bayar Tukang',
  OPERATIONAL: 'Keperluan Bengkel (Paku/Lem/Cat)',
  PERSONAL_DRAW: 'Ambil Pribadi (Prive)',
};
