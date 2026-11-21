import {
  CashFlow,
  CashFlowCategory,
  CashFlowSummary,
  CashFlowType,
  CreateCashFlowInput,
  DashboardSummary,
} from '../types/domain';
import {
  getLocalTimestampIso,
  getOffsetDateString,
  getTodayDatePrefix,
} from '../utils/formatters';
import { getDatabase, runInTransaction } from './database';

export type CashFlowPeriod = 'TODAY' | 'WEEK' | 'MONTH' | 'ALL';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const db = await getDatabase();
  const today = getTodayDatePrefix();

  const todayRows = await db.getAllAsync<{ type: CashFlowType; total: number }>(
    `SELECT type, COALESCE(SUM(amount), 0) AS total
     FROM cash_flows
     WHERE substr(created_at, 1, 10) = ?
     GROUP BY type`,
    today
  );

  let todayIn = 0;
  let todayOut = 0;
  for (const row of todayRows) {
    if (row.type === 'IN') {
      todayIn = Math.round(row.total);
    } else if (row.type === 'OUT') {
      todayOut = Math.round(row.total);
    }
  }

  const woodUnpaidRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(MAX(0, total_amount - paid_amount)), 0) AS total
     FROM wood_sales
     WHERE payment_status = 'PARTIAL'`
  );

  const furnitureUnpaidRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(MAX(0, total_price - paid_amount)), 0) AS total
     FROM furniture_orders
     WHERE paid_amount < total_price`
  );

  const activeOrdersRow = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM furniture_orders WHERE status != 'COMPLETED'`
  );

  const lowStockRow = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM wood_stocks WHERE stock_qty <= 5`
  );

  const totalUnpaidWoodSales = Math.round(woodUnpaidRow?.total ?? 0);
  const totalUnpaidFurniture = Math.round(furnitureUnpaidRow?.total ?? 0);

  return {
    todayIn,
    todayOut,
    totalUnpaidWoodSales,
    totalUnpaidFurniture,
    totalUnpaidAll: totalUnpaidWoodSales + totalUnpaidFurniture,
    activeFurnitureOrdersCount: activeOrdersRow?.cnt ?? 0,
    lowStockCount: lowStockRow?.cnt ?? 0,
  };
}

export async function listCashFlows(options?: {
  period?: CashFlowPeriod;
  type?: 'ALL' | CashFlowType;
  category?: 'ALL' | CashFlowCategory;
}): Promise<{ rows: CashFlow[]; summary: CashFlowSummary }> {
  const db = await getDatabase();
  const period = options?.period ?? 'TODAY';
  const type = options?.type ?? 'ALL';
  const category = options?.category ?? 'ALL';

  const periodConditions: string[] = [];
  const periodParams: string[] = [];
  const today = getTodayDatePrefix();

  if (period === 'TODAY') {
    periodConditions.push('substr(created_at, 1, 10) = ?');
    periodParams.push(today);
  } else if (period === 'WEEK') {
    periodConditions.push('substr(created_at, 1, 10) >= ?');
    periodParams.push(getOffsetDateString(-6));
  } else if (period === 'MONTH') {
    periodConditions.push('substr(created_at, 1, 7) = ?');
    periodParams.push(today.slice(0, 7));
  }

  const periodWhere =
    periodConditions.length > 0 ? `WHERE ${periodConditions.join(' AND ')}` : '';

  const periodRows = await db.getAllAsync<CashFlow>(
    `SELECT * FROM cash_flows ${periodWhere} ORDER BY created_at DESC, id DESC`,
    ...periodParams
  );

  let totalIn = 0;
  let businessOut = 0;
  let personalDrawOut = 0;

  for (const row of periodRows) {
    if (row.type === 'IN') {
      totalIn += row.amount;
    } else if (row.category === 'PERSONAL_DRAW') {
      personalDrawOut += row.amount;
    } else {
      businessOut += row.amount;
    }
  }

  const filteredRows = periodRows.filter((row) => {
    if (type !== 'ALL' && row.type !== type) {
      return false;
    }
    if (category !== 'ALL' && row.category !== category) {
      return false;
    }
    return true;
  });

  const roundedIn = Math.round(totalIn);
  const roundedBusinessOut = Math.round(businessOut);
  const roundedPersonalOut = Math.round(personalDrawOut);
  const totalOut = roundedBusinessOut + roundedPersonalOut;

  return {
    rows: filteredRows,
    summary: {
      totalIn: roundedIn,
      businessOut: roundedBusinessOut,
      personalDrawOut: roundedPersonalOut,
      totalOut,
      businessNet: roundedIn - roundedBusinessOut,
      cashBalance: roundedIn - totalOut,
    },
  };
}

export async function addManualCashFlow(input: CreateCashFlowInput): Promise<number> {
  const cleanAmount = Math.round(input.amount);
  if (cleanAmount <= 0) {
    throw new Error('Nominal uang harus lebih dari Rp 0.');
  }
  const cleanDesc = input.description.trim();
  if (!cleanDesc) {
    throw new Error('Keterangan transaksi wajib diisi.');
  }

  const now = getLocalTimestampIso();

  return runInTransaction(async (txn) => {
    const res = await txn.runAsync(
      `INSERT INTO cash_flows (type, category, amount, description, reference_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      input.type,
      input.category,
      cleanAmount,
      cleanDesc,
      input.referenceId?.trim() ?? '',
      now
    );
    return res.lastInsertRowId;
  });
}

export async function deleteCashFlow(id: number): Promise<void> {
  await runInTransaction(async (txn) => {
    const row = await txn.getFirstAsync<CashFlow>(
      'SELECT * FROM cash_flows WHERE id = ?',
      id
    );
    if (!row) {
      throw new Error('Catatan kas tidak ditemukan.');
    }
    if (row.reference_id) {
      throw new Error(
        'Catatan ini otomatis dari nota atau orderan sehingga tidak dapat dihapus dari Buku Kas.'
      );
    }
    await txn.runAsync('DELETE FROM cash_flows WHERE id = ?', id);
  });
}
