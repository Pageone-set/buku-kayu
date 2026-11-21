import {
  CreateWoodSaleInput,
  WoodPaymentStatus,
  WoodSale,
  WoodSaleDetail,
  WoodSaleItem,
  WoodSalePayment,
  WoodStock,
} from '../types/domain';
import {
  calculateItemSubtotal,
  calculateRemainingAmount,
  calculateVolumeM3,
} from '../utils/cubicCalculator';
import {
  generateInvoiceNumber,
  getLocalTimestampIso,
} from '../utils/formatters';
import { getDatabase, runInTransaction } from './database';

export async function listWoodSales(
  filter: 'ALL' | WoodPaymentStatus = 'ALL',
  search = ''
): Promise<WoodSale[]> {
  const db = await getDatabase();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filter !== 'ALL') {
    conditions.push('payment_status = ?');
    params.push(filter);
  }

  const trimmed = search.trim();
  if (trimmed) {
    conditions.push('(customer_name LIKE ? OR invoice_number LIKE ?)');
    params.push(`%${trimmed}%`, `%${trimmed}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.getAllAsync<WoodSale>(
    `SELECT * FROM wood_sales ${whereClause} ORDER BY created_at DESC, id DESC`,
    ...params
  );
}

export async function getWoodSaleDetail(id: number): Promise<WoodSaleDetail | null> {
  const db = await getDatabase();
  const sale = await db.getFirstAsync<WoodSale>(
    'SELECT * FROM wood_sales WHERE id = ?',
    id
  );
  if (!sale) {
    return null;
  }

  const items = await db.getAllAsync<WoodSaleItem>(
    'SELECT * FROM wood_sale_items WHERE sale_id = ? ORDER BY id ASC',
    id
  );
  const payments = await db.getAllAsync<WoodSalePayment>(
    'SELECT * FROM wood_sale_payments WHERE sale_id = ? ORDER BY payment_date ASC, id ASC',
    id
  );

  return {
    ...sale,
    items,
    payments,
  };
}

export async function createWoodSale(input: CreateWoodSaleInput): Promise<number> {
  if (input.items.length === 0) {
    throw new Error('Tambahkan minimal 1 ukuran kayu ke nota.');
  }

  const preparedItems = input.items.map((item) => {
    if (!item.woodType.trim()) {
      throw new Error('Jenis kayu pada item tidak boleh kosong.');
    }
    if (
      item.lengthCm <= 0 ||
      item.widthCm <= 0 ||
      item.thicknessCm <= 0 ||
      item.qty <= 0
    ) {
      throw new Error('Ukuran dan jumlah batang harus lebih dari 0.');
    }
    if (item.pricePerM3 <= 0) {
      throw new Error('Harga per m³ harus lebih dari Rp 0.');
    }

    const volumeM3 = calculateVolumeM3(
      item.lengthCm,
      item.widthCm,
      item.thicknessCm,
      item.qty
    );
    const subtotal = calculateItemSubtotal(volumeM3, item.pricePerM3);

    return {
      ...item,
      woodType: item.woodType.trim(),
      volumeM3,
      subtotal,
    };
  });

  const totalVolumeM3 =
    Math.round(
      preparedItems.reduce((sum, item) => sum + item.volumeM3, 0) * 1_000_000
    ) / 1_000_000;
  const totalAmount = Math.round(
    preparedItems.reduce((sum, item) => sum + item.subtotal, 0)
  );

  const requestedPaid =
    input.paymentStatus === 'PAID'
      ? totalAmount
      : Math.max(0, Math.min(totalAmount, Math.round(input.paidAmount)));

  const effectiveStatus: WoodPaymentStatus =
    requestedPaid >= totalAmount ? 'PAID' : 'PARTIAL';

  const buyerName = input.customerName.trim() || 'Pembeli Umum';
  if (effectiveStatus === 'PARTIAL' && !input.customerName.trim()) {
    throw new Error('Nama pembeli wajib diisi untuk transaksi Kasbon / Kurang Bayar.');
  }

  const now = getLocalTimestampIso();
  const invoiceNumber = generateInvoiceNumber('KY');

  return runInTransaction(async (txn) => {
    for (const item of preparedItems) {
      if (item.stockId !== null) {
        const stockRow = await txn.getFirstAsync<WoodStock>(
          'SELECT * FROM wood_stocks WHERE id = ?',
          item.stockId
        );
        if (!stockRow) {
          throw new Error(`Stok ${item.woodType} tidak ditemukan lagi.`);
        }
        if (stockRow.stock_qty < item.qty) {
          throw new Error(
            `Stok ${stockRow.wood_type} tidak cukup (tersisa ${stockRow.stock_qty} batang).`
          );
        }
        await txn.runAsync(
          'UPDATE wood_stocks SET stock_qty = stock_qty - ?, updated_at = ? WHERE id = ?',
          item.qty,
          now,
          item.stockId
        );
      }
    }

    const saleRes = await txn.runAsync(
      `INSERT INTO wood_sales
        (invoice_number, customer_name, customer_phone, total_volume_m3, total_amount, paid_amount, payment_status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      invoiceNumber,
      buyerName,
      input.customerPhone.trim(),
      totalVolumeM3,
      totalAmount,
      requestedPaid,
      effectiveStatus,
      input.notes.trim(),
      now
    );
    const saleId = saleRes.lastInsertRowId;

    for (const item of preparedItems) {
      await txn.runAsync(
        `INSERT INTO wood_sale_items
          (sale_id, stock_id, wood_type, length_cm, width_cm, thickness_cm, qty, volume_m3, price_per_m3, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        saleId,
        item.stockId,
        item.woodType,
        item.lengthCm,
        item.widthCm,
        item.thicknessCm,
        item.qty,
        item.volumeM3,
        item.pricePerM3,
        item.subtotal
      );
    }

    if (requestedPaid > 0) {
      const paymentNote =
        effectiveStatus === 'PAID' ? 'Pembayaran lunas' : 'DP kasbon awal';
      await txn.runAsync(
        `INSERT INTO wood_sale_payments (sale_id, amount, payment_date, note)
         VALUES (?, ?, ?, ?)`,
        saleId,
        requestedPaid,
        now,
        paymentNote
      );

      const cashDesc =
        effectiveStatus === 'PAID'
          ? `Jual kayu lunas - ${buyerName} (${invoiceNumber})`
          : `DP jual kayu - ${buyerName} (${invoiceNumber})`;

      await txn.runAsync(
        `INSERT INTO cash_flows (type, category, amount, description, reference_id, created_at)
         VALUES ('IN', 'WOOD_SALE', ?, ?, ?, ?)`,
        requestedPaid,
        cashDesc,
        invoiceNumber,
        now
      );
    }

    return saleId;
  });
}

export async function addWoodSalePayment(
  saleId: number,
  amount: number,
  note = ''
): Promise<void> {
  const cleanAmount = Math.round(amount);
  if (cleanAmount <= 0) {
    throw new Error('Nominal pembayaran harus lebih dari Rp 0.');
  }

  const now = getLocalTimestampIso();

  await runInTransaction(async (txn) => {
    const sale = await txn.getFirstAsync<WoodSale>(
      'SELECT * FROM wood_sales WHERE id = ?',
      saleId
    );
    if (!sale) {
      throw new Error('Nota penjualan kayu tidak ditemukan.');
    }

    const remaining = calculateRemainingAmount(sale.total_amount, sale.paid_amount);
    if (remaining <= 0) {
      throw new Error('Nota ini sudah lunas.');
    }
    if (cleanAmount > remaining) {
      throw new Error('Nominal bayar melebihi sisa kurang bayar.');
    }

    const nextPaid = sale.paid_amount + cleanAmount;
    const nextStatus: WoodPaymentStatus =
      nextPaid >= sale.total_amount ? 'PAID' : 'PARTIAL';

    await txn.runAsync(
      'UPDATE wood_sales SET paid_amount = ?, payment_status = ? WHERE id = ?',
      nextPaid,
      nextStatus,
      saleId
    );

    const effectiveNote =
      note.trim() || (nextStatus === 'PAID' ? 'Pelunasan kasbon' : 'Cicilan kasbon');

    await txn.runAsync(
      `INSERT INTO wood_sale_payments (sale_id, amount, payment_date, note)
       VALUES (?, ?, ?, ?)`,
      saleId,
      cleanAmount,
      now,
      effectiveNote
    );

    await txn.runAsync(
      `INSERT INTO cash_flows (type, category, amount, description, reference_id, created_at)
       VALUES ('IN', 'WOOD_SALE', ?, ?, ?, ?)`,
      cleanAmount,
      `Bayar kasbon kayu - ${sale.customer_name} (${sale.invoice_number})`,
      sale.invoice_number,
      now
    );
  });
}
