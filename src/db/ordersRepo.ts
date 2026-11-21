import {
  CashFlowCategory,
  CreateFurnitureOrderInput,
  FurnitureCost,
  FurnitureCostCategory,
  FurnitureOrder,
  FurnitureOrderDetail,
  FurnitureOrderStatus,
  FurniturePayment,
  FurniturePaymentType,
} from '../types/domain';
import { calculateRemainingAmount } from '../utils/cubicCalculator';
import {
  generateInvoiceNumber,
  getLocalTimestampIso,
} from '../utils/formatters';
import { getDatabase, runInTransaction } from './database';

function mapCostCategoryToCashFlow(category: FurnitureCostCategory): CashFlowCategory {
  switch (category) {
    case 'WOOD':
      return 'MATERIAL_BUY';
    case 'LABOR':
      return 'LABOR_WAGE';
    case 'ACCESSORIES':
      return 'OPERATIONAL';
  }
}

export async function listFurnitureOrders(
  filter: 'ACTIVE' | 'ALL' | FurnitureOrderStatus = 'ACTIVE'
): Promise<FurnitureOrder[]> {
  const db = await getDatabase();

  if (filter === 'ALL') {
    return db.getAllAsync<FurnitureOrder>(
      'SELECT * FROM furniture_orders ORDER BY created_at DESC, id DESC'
    );
  }

  if (filter === 'ACTIVE') {
    return db.getAllAsync<FurnitureOrder>(
      `SELECT * FROM furniture_orders
       WHERE status != 'COMPLETED'
       ORDER BY deadline_date ASC, created_at DESC`
    );
  }

  return db.getAllAsync<FurnitureOrder>(
    `SELECT * FROM furniture_orders
     WHERE status = ?
     ORDER BY deadline_date ASC, created_at DESC`,
    filter
  );
}

export async function getFurnitureOrderDetail(
  id: number
): Promise<FurnitureOrderDetail | null> {
  const db = await getDatabase();
  const order = await db.getFirstAsync<FurnitureOrder>(
    'SELECT * FROM furniture_orders WHERE id = ?',
    id
  );
  if (!order) {
    return null;
  }

  const payments = await db.getAllAsync<FurniturePayment>(
    'SELECT * FROM furniture_payments WHERE order_id = ? ORDER BY payment_date ASC, id ASC',
    id
  );
  const costs = await db.getAllAsync<FurnitureCost>(
    'SELECT * FROM furniture_costs WHERE order_id = ? ORDER BY created_at DESC, id DESC',
    id
  );

  return {
    ...order,
    payments,
    costs,
  };
}

export async function createFurnitureOrder(
  input: CreateFurnitureOrderInput
): Promise<number> {
  const customerName = input.customerName.trim();
  const itemName = input.itemName.trim();
  const totalPrice = Math.round(input.totalPrice);
  const initialDp = Math.max(0, Math.min(totalPrice, Math.round(input.initialDp)));

  if (!customerName) {
    throw new Error('Nama pelanggan wajib diisi.');
  }
  if (!itemName) {
    throw new Error('Nama barang / pesanan wajib diisi.');
  }
  if (totalPrice <= 0) {
    throw new Error('Harga jual total harus lebih dari Rp 0.');
  }

  const now = getLocalTimestampIso();
  const orderCode = generateInvoiceNumber('FR');

  return runInTransaction(async (txn) => {
    const res = await txn.runAsync(
      `INSERT INTO furniture_orders
        (order_code, customer_name, customer_phone, item_name, total_price, paid_amount, production_cost, status, deadline_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 'ORDERED', ?, ?)`,
      orderCode,
      customerName,
      input.customerPhone.trim(),
      itemName,
      totalPrice,
      initialDp,
      input.deadlineDate,
      now
    );
    const orderId = res.lastInsertRowId;

    if (initialDp > 0) {
      const payType: FurniturePaymentType =
        initialDp >= totalPrice ? 'FINAL' : 'DP';
      const note =
        input.dpNote?.trim() ||
        (payType === 'FINAL' ? 'Bayar lunas di awal' : 'DP awal orderan');

      await txn.runAsync(
        `INSERT INTO furniture_payments (order_id, amount, payment_type, payment_date, note)
         VALUES (?, ?, ?, ?, ?)`,
        orderId,
        initialDp,
        payType,
        now,
        note
      );

      await txn.runAsync(
        `INSERT INTO cash_flows (type, category, amount, description, reference_id, created_at)
         VALUES ('IN', 'FURNITURE_PAYMENT', ?, ?, ?, ?)`,
        initialDp,
        `${payType === 'FINAL' ? 'Bayar lunas' : 'DP'} order ${itemName} - ${customerName}`,
        orderCode,
        now
      );
    }

    return orderId;
  });
}

export async function updateFurnitureOrderStatus(
  orderId: number,
  status: FurnitureOrderStatus
): Promise<void> {
  await runInTransaction(async (txn) => {
    await txn.runAsync(
      'UPDATE furniture_orders SET status = ? WHERE id = ?',
      status,
      orderId
    );
  });
}

export async function addFurniturePayment(
  orderId: number,
  amount: number,
  paymentType: FurniturePaymentType,
  note = ''
): Promise<void> {
  const cleanAmount = Math.round(amount);
  if (cleanAmount <= 0) {
    throw new Error('Nominal pembayaran harus lebih dari Rp 0.');
  }

  const now = getLocalTimestampIso();

  await runInTransaction(async (txn) => {
    const order = await txn.getFirstAsync<FurnitureOrder>(
      'SELECT * FROM furniture_orders WHERE id = ?',
      orderId
    );
    if (!order) {
      throw new Error('Orderan furniture tidak ditemukan.');
    }

    const remaining = calculateRemainingAmount(order.total_price, order.paid_amount);
    if (remaining <= 0) {
      throw new Error('Pembayaran orderan ini sudah lunas.');
    }
    if (cleanAmount > remaining) {
      throw new Error('Nominal melebihi sisa tagihan orderan.');
    }

    const nextPaid = order.paid_amount + cleanAmount;
    const effectiveType: FurniturePaymentType =
      nextPaid >= order.total_price ? 'FINAL' : paymentType;

    await txn.runAsync(
      'UPDATE furniture_orders SET paid_amount = ? WHERE id = ?',
      nextPaid,
      orderId
    );

    const effectiveNote =
      note.trim() ||
      (effectiveType === 'FINAL'
        ? 'Pelunasan orderan'
        : effectiveType === 'DP'
        ? 'DP awal'
        : 'Cicilan termin');

    await txn.runAsync(
      `INSERT INTO furniture_payments (order_id, amount, payment_type, payment_date, note)
       VALUES (?, ?, ?, ?, ?)`,
      orderId,
      cleanAmount,
      effectiveType,
      now,
      effectiveNote
    );

    await txn.runAsync(
      `INSERT INTO cash_flows (type, category, amount, description, reference_id, created_at)
       VALUES ('IN', 'FURNITURE_PAYMENT', ?, ?, ?, ?)`,
      cleanAmount,
      `${
        effectiveType === 'FINAL' ? 'Pelunasan' : 'Bayar termin'
      } ${order.item_name} - ${order.customer_name}`,
      order.order_code,
      now
    );
  });
}

export async function addFurnitureCost(
  orderId: number,
  costCategory: FurnitureCostCategory,
  description: string,
  amount: number,
  recordInCashFlow: boolean
): Promise<void> {
  const cleanAmount = Math.round(amount);
  if (cleanAmount <= 0) {
    throw new Error('Nominal biaya pengerjaan harus lebih dari Rp 0.');
  }
  const cleanDesc = description.trim();
  if (!cleanDesc) {
    throw new Error('Keterangan biaya pengerjaan wajib diisi.');
  }

  const now = getLocalTimestampIso();

  await runInTransaction(async (txn) => {
    const order = await txn.getFirstAsync<FurnitureOrder>(
      'SELECT * FROM furniture_orders WHERE id = ?',
      orderId
    );
    if (!order) {
      throw new Error('Orderan furniture tidak ditemukan.');
    }

    await txn.runAsync(
      `INSERT INTO furniture_costs (order_id, cost_category, description, amount, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      orderId,
      costCategory,
      cleanDesc,
      cleanAmount,
      now
    );

    await txn.runAsync(
      'UPDATE furniture_orders SET production_cost = production_cost + ? WHERE id = ?',
      cleanAmount,
      orderId
    );

    if (recordInCashFlow) {
      await txn.runAsync(
        `INSERT INTO cash_flows (type, category, amount, description, reference_id, created_at)
         VALUES ('OUT', ?, ?, ?, ?, ?)`,
        mapCostCategoryToCashFlow(costCategory),
        cleanAmount,
        `Biaya ${order.item_name}: ${cleanDesc}`,
        order.order_code,
        now
      );
    }
  });
}
