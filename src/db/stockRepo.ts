import {
  AdjustStockInput,
  CreateWoodStockInput,
  WOOD_TYPE_PRESETS,
  WoodStock,
} from '../types/domain';
import { calculateItemSubtotal, calculateVolumeM3 } from '../utils/cubicCalculator';
import { formatDimension, getLocalTimestampIso } from '../utils/formatters';
import { getDatabase, runInTransaction } from './database';

export async function listWoodStocks(woodTypeFilter?: string): Promise<WoodStock[]> {
  const db = await getDatabase();

  if (!woodTypeFilter || woodTypeFilter === 'Semua') {
    return db.getAllAsync<WoodStock>(
      `SELECT * FROM wood_stocks
       ORDER BY wood_type ASC, thickness_cm ASC, width_cm ASC, length_cm ASC`
    );
  }

  if (woodTypeFilter === 'Lainnya') {
    const placeholders = WOOD_TYPE_PRESETS.map(() => '?').join(', ');
    return db.getAllAsync<WoodStock>(
      `SELECT * FROM wood_stocks
       WHERE wood_type NOT IN (${placeholders})
       ORDER BY wood_type ASC, thickness_cm ASC, width_cm ASC, length_cm ASC`,
      ...WOOD_TYPE_PRESETS
    );
  }

  return db.getAllAsync<WoodStock>(
    `SELECT * FROM wood_stocks
     WHERE wood_type = ?
     ORDER BY thickness_cm ASC, width_cm ASC, length_cm ASC`,
    woodTypeFilter
  );
}

export async function getWoodStockById(id: number): Promise<WoodStock | null> {
  const db = await getDatabase();
  return db.getFirstAsync<WoodStock>('SELECT * FROM wood_stocks WHERE id = ?', id);
}

export async function addOrRestockWood(input: CreateWoodStockInput): Promise<number> {
  const woodType = input.woodType.trim();
  if (!woodType) {
    throw new Error('Jenis kayu wajib diisi.');
  }
  if (input.lengthCm <= 0 || input.widthCm <= 0 || input.thicknessCm <= 0) {
    throw new Error('Ukuran panjang, lebar, dan tebal harus lebih dari 0.');
  }
  if (input.stockQty < 0) {
    throw new Error('Jumlah batang tidak boleh minus.');
  }

  const now = getLocalTimestampIso();

  return runInTransaction(async (txn) => {
    const existing = await txn.getFirstAsync<WoodStock>(
      `SELECT * FROM wood_stocks
       WHERE LOWER(TRIM(wood_type)) = LOWER(?)
         AND length_cm = ?
         AND width_cm = ?
         AND thickness_cm = ?`,
      woodType,
      input.lengthCm,
      input.widthCm,
      input.thicknessCm
    );

    let stockId: number;

    if (existing) {
      const nextQty = existing.stock_qty + input.stockQty;
      await txn.runAsync(
        `UPDATE wood_stocks
         SET stock_qty = ?,
             buy_price_m3 = ?,
             sell_price_m3 = ?,
             updated_at = ?
         WHERE id = ?`,
        nextQty,
        input.buyPriceM3 > 0 ? input.buyPriceM3 : existing.buy_price_m3,
        input.sellPriceM3 > 0 ? input.sellPriceM3 : existing.sell_price_m3,
        now,
        existing.id
      );
      stockId = existing.id;
    } else {
      const insertRes = await txn.runAsync(
        `INSERT INTO wood_stocks
          (wood_type, length_cm, width_cm, thickness_cm, stock_qty, buy_price_m3, sell_price_m3, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        woodType,
        input.lengthCm,
        input.widthCm,
        input.thicknessCm,
        input.stockQty,
        Math.max(0, input.buyPriceM3),
        Math.max(0, input.sellPriceM3),
        now
      );
      stockId = insertRes.lastInsertRowId;
    }

    if (input.recordCashOut && input.stockQty > 0 && input.buyPriceM3 > 0) {
      const volume = calculateVolumeM3(
        input.lengthCm,
        input.widthCm,
        input.thicknessCm,
        input.stockQty
      );
      const costAmount = calculateItemSubtotal(volume, input.buyPriceM3);
      if (costAmount > 0) {
        const desc = `Kulakan ${woodType} (${formatDimension(
          input.lengthCm,
          input.widthCm,
          input.thicknessCm
        )}) ${input.stockQty} btg`;
        await txn.runAsync(
          `INSERT INTO cash_flows (type, category, amount, description, reference_id, created_at)
           VALUES ('OUT', 'MATERIAL_BUY', ?, ?, ?, ?)`,
          costAmount,
          desc,
          `STK-${stockId}`,
          now
        );
      }
    }

    return stockId;
  });
}

export async function adjustWoodStock(input: AdjustStockInput): Promise<void> {
  const now = getLocalTimestampIso();

  await runInTransaction(async (txn) => {
    const existing = await txn.getFirstAsync<WoodStock>(
      'SELECT * FROM wood_stocks WHERE id = ?',
      input.id
    );
    if (!existing) {
      throw new Error('Data stok kayu tidak ditemukan.');
    }

    const nextQty = existing.stock_qty + input.deltaQty;
    if (nextQty < 0) {
      throw new Error(
        `Stok tidak cukup. Tersisa ${existing.stock_qty} batang.`
      );
    }

    const nextBuyPrice =
      input.buyPriceM3 !== undefined ? Math.max(0, input.buyPriceM3) : existing.buy_price_m3;
    const nextSellPrice =
      input.sellPriceM3 !== undefined ? Math.max(0, input.sellPriceM3) : existing.sell_price_m3;

    await txn.runAsync(
      `UPDATE wood_stocks
       SET stock_qty = ?,
           buy_price_m3 = ?,
           sell_price_m3 = ?,
           updated_at = ?
       WHERE id = ?`,
      nextQty,
      nextBuyPrice,
      nextSellPrice,
      now,
      existing.id
    );

    if (input.recordCashOut && input.deltaQty > 0 && nextBuyPrice > 0) {
      const addedVolume = calculateVolumeM3(
        existing.length_cm,
        existing.width_cm,
        existing.thickness_cm,
        input.deltaQty
      );
      const costAmount = calculateItemSubtotal(addedVolume, nextBuyPrice);
      if (costAmount > 0) {
        const desc = `Kulakan ${existing.wood_type} (${formatDimension(
          existing.length_cm,
          existing.width_cm,
          existing.thickness_cm
        )}) +${input.deltaQty} btg`;
        await txn.runAsync(
          `INSERT INTO cash_flows (type, category, amount, description, reference_id, created_at)
           VALUES ('OUT', 'MATERIAL_BUY', ?, ?, ?, ?)`,
          costAmount,
          desc,
          `STK-${existing.id}`,
          now
        );
      }
    }
  });
}

export async function deleteWoodStock(id: number): Promise<void> {
  await runInTransaction(async (txn) => {
    await txn.runAsync('DELETE FROM wood_stocks WHERE id = ?', id);
  });
}
