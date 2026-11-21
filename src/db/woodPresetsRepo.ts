import {
  SaveWoodDimensionInput,
  SaveWoodTypeInput,
  UpdateWoodMarketPriceInput,
  WoodDimensionPreset,
  WoodTypePreset,
} from '../types/domain';
import { getLocalTimestampIso } from '../utils/formatters';
import {
  validateWoodDimensionInput,
  validateWoodTypeInput,
} from '../utils/woodPresetHelpers';
import { getDatabase, runInTransaction } from './database';

export async function listWoodTypes(): Promise<WoodTypePreset[]> {
  const db = await getDatabase();
  return db.getAllAsync<WoodTypePreset>(
    'SELECT * FROM wood_types ORDER BY sort_order ASC, id ASC'
  );
}

export async function createWoodType(input: SaveWoodTypeInput): Promise<number> {
  const clean = validateWoodTypeInput(input);
  const now = getLocalTimestampIso();

  return runInTransaction(async (txn) => {
    const duplicate = await txn.getFirstAsync<{ id: number }>(
      'SELECT id FROM wood_types WHERE LOWER(TRIM(name)) = LOWER(?)',
      clean.name
    );
    if (duplicate) {
      throw new Error(`Jenis kayu "${clean.name}" sudah ada.`);
    }

    const orderRow = await txn.getFirstAsync<{ max_order: number | null }>(
      'SELECT MAX(sort_order) AS max_order FROM wood_types'
    );
    const nextOrder = (orderRow?.max_order ?? 0) + 1;

    const res = await txn.runAsync(
      `INSERT INTO wood_types (name, color_hex, default_buy_price_m3, default_price_m3, price_updated_at, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      clean.name,
      clean.colorHex,
      clean.defaultBuyPriceM3,
      clean.defaultPriceM3,
      now,
      nextOrder,
      now
    );
    return res.lastInsertRowId;
  });
}

export async function updateWoodType(
  id: number,
  input: SaveWoodTypeInput
): Promise<void> {
  const clean = validateWoodTypeInput(input);
  const now = getLocalTimestampIso();

  await runInTransaction(async (txn) => {
    const existing = await txn.getFirstAsync<WoodTypePreset>(
      'SELECT * FROM wood_types WHERE id = ?',
      id
    );
    if (!existing) {
      throw new Error('Data jenis kayu tidak ditemukan.');
    }

    const duplicate = await txn.getFirstAsync<{ id: number }>(
      'SELECT id FROM wood_types WHERE LOWER(TRIM(name)) = LOWER(?) AND id != ?',
      clean.name,
      id
    );
    if (duplicate) {
      throw new Error(`Jenis kayu "${clean.name}" sudah digunakan.`);
    }

    await txn.runAsync(
      `UPDATE wood_types
       SET name = ?, color_hex = ?, default_buy_price_m3 = ?, default_price_m3 = ?, price_updated_at = ?
       WHERE id = ?`,
      clean.name,
      clean.colorHex,
      clean.defaultBuyPriceM3,
      clean.defaultPriceM3,
      now,
      id
    );

    if (
      existing.name.toLowerCase() !== clean.name.toLowerCase() ||
      existing.name !== clean.name
    ) {
      await txn.runAsync(
        `UPDATE wood_stocks
         SET wood_type = ?
         WHERE LOWER(TRIM(wood_type)) = LOWER(?)`,
        clean.name,
        existing.name
      );
    }
  });
}

export async function updateWoodMarketPrice(
  input: UpdateWoodMarketPriceInput
): Promise<{ syncedStocksCount: number }> {
  if (!Number.isFinite(input.buyPriceM3) || input.buyPriceM3 < 0) {
    throw new Error('Harga beli pasar per m³ tidak boleh minus.');
  }
  if (!Number.isFinite(input.sellPriceM3) || input.sellPriceM3 < 0) {
    throw new Error('Harga jual pasar per m³ tidak boleh minus.');
  }

  const buyPriceM3 = Math.round(input.buyPriceM3);
  const sellPriceM3 = Math.round(input.sellPriceM3);
  const now = getLocalTimestampIso();

  return runInTransaction(async (txn) => {
    const existing = await txn.getFirstAsync<WoodTypePreset>(
      'SELECT * FROM wood_types WHERE id = ?',
      input.id
    );
    if (!existing) {
      throw new Error('Data jenis kayu tidak ditemukan.');
    }

    await txn.runAsync(
      `UPDATE wood_types
       SET default_buy_price_m3 = ?, default_price_m3 = ?, price_updated_at = ?
       WHERE id = ?`,
      buyPriceM3,
      sellPriceM3,
      now,
      input.id
    );

    let syncedStocksCount = 0;
    if (input.syncToStocks) {
      const updateRes = await txn.runAsync(
        `UPDATE wood_stocks
         SET buy_price_m3 = CASE WHEN ? > 0 THEN ? ELSE buy_price_m3 END,
             sell_price_m3 = CASE WHEN ? > 0 THEN ? ELSE sell_price_m3 END,
             updated_at = ?
         WHERE LOWER(TRIM(wood_type)) = LOWER(TRIM(?))`,
        buyPriceM3,
        buyPriceM3,
        sellPriceM3,
        sellPriceM3,
        now,
        existing.name
      );
      syncedStocksCount = updateRes.changes;
    }

    return { syncedStocksCount };
  });
}

export async function deleteWoodType(id: number): Promise<void> {
  await runInTransaction(async (txn) => {
    await txn.runAsync('DELETE FROM wood_types WHERE id = ?', id);
  });
}

export async function listWoodDimensions(): Promise<WoodDimensionPreset[]> {
  const db = await getDatabase();
  return db.getAllAsync<WoodDimensionPreset>(
    'SELECT * FROM wood_dimensions ORDER BY sort_order ASC, id ASC'
  );
}

export async function createWoodDimension(
  input: SaveWoodDimensionInput
): Promise<number> {
  const clean = validateWoodDimensionInput(input);
  const now = getLocalTimestampIso();

  return runInTransaction(async (txn) => {
    const duplicate = await txn.getFirstAsync<{ id: number }>(
      `SELECT id FROM wood_dimensions
       WHERE thickness_cm = ? AND width_cm = ? AND default_length_cm = ?`,
      clean.thicknessCm,
      clean.widthCm,
      clean.defaultLengthCm
    );
    if (duplicate) {
      throw new Error(
        `Ukuran ${clean.thicknessCm}×${clean.widthCm} cm (${clean.defaultLengthCm} cm) sudah ada.`
      );
    }

    const orderRow = await txn.getFirstAsync<{ max_order: number | null }>(
      'SELECT MAX(sort_order) AS max_order FROM wood_dimensions'
    );
    const nextOrder = (orderRow?.max_order ?? 0) + 1;

    const res = await txn.runAsync(
      `INSERT INTO wood_dimensions (label, thickness_cm, width_cm, default_length_cm, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      clean.label,
      clean.thicknessCm,
      clean.widthCm,
      clean.defaultLengthCm,
      nextOrder,
      now
    );
    return res.lastInsertRowId;
  });
}

export async function updateWoodDimension(
  id: number,
  input: SaveWoodDimensionInput
): Promise<void> {
  const clean = validateWoodDimensionInput(input);

  await runInTransaction(async (txn) => {
    const existing = await txn.getFirstAsync<WoodDimensionPreset>(
      'SELECT * FROM wood_dimensions WHERE id = ?',
      id
    );
    if (!existing) {
      throw new Error('Data ukuran tidak ditemukan.');
    }

    const duplicate = await txn.getFirstAsync<{ id: number }>(
      `SELECT id FROM wood_dimensions
       WHERE thickness_cm = ? AND width_cm = ? AND default_length_cm = ? AND id != ?`,
      clean.thicknessCm,
      clean.widthCm,
      clean.defaultLengthCm,
      id
    );
    if (duplicate) {
      throw new Error(
        `Ukuran ${clean.thicknessCm}×${clean.widthCm} cm (${clean.defaultLengthCm} cm) sudah ada.`
      );
    }

    await txn.runAsync(
      `UPDATE wood_dimensions
       SET label = ?, thickness_cm = ?, width_cm = ?, default_length_cm = ?
       WHERE id = ?`,
      clean.label,
      clean.thicknessCm,
      clean.widthCm,
      clean.defaultLengthCm,
      id
    );
  });
}

export async function deleteWoodDimension(id: number): Promise<void> {
  await runInTransaction(async (txn) => {
    await txn.runAsync('DELETE FROM wood_dimensions WHERE id = ?', id);
  });
}
