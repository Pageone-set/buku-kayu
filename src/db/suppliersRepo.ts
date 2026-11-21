import {
  SaveWoodSupplierInput,
  WoodSupplier,
  WoodSupplierPrice,
  WoodSupplierWithPrices,
} from '../types/domain';
import { getLocalTimestampIso } from '../utils/formatters';
import { validateWoodSupplierInput } from '../utils/supplierHelpers';
import { getDatabase, runInTransaction } from './database';

export async function listWoodSuppliers(
  search = '',
  woodTypeFilter = 'Semua'
): Promise<WoodSupplierWithPrices[]> {
  const db = await getDatabase();
  const [suppliers, priceRows] = await Promise.all([
    db.getAllAsync<WoodSupplier>(
      'SELECT * FROM wood_suppliers ORDER BY updated_at DESC, id DESC'
    ),
    db.getAllAsync<WoodSupplierPrice>(
      'SELECT * FROM wood_supplier_prices ORDER BY id ASC'
    ),
  ]);

  const priceMap = new Map<number, WoodSupplierPrice[]>();
  for (const row of priceRows) {
    const list = priceMap.get(row.supplier_id) ?? [];
    list.push(row);
    priceMap.set(row.supplier_id, list);
  }

  let combined: WoodSupplierWithPrices[] = suppliers.map((s) => ({
    ...s,
    items: priceMap.get(s.id) ?? [],
  }));

  const normalizedFilter = woodTypeFilter.trim().toLowerCase();
  if (normalizedFilter && normalizedFilter !== 'semua') {
    combined = combined.filter((s) =>
      s.items.some((item) => item.wood_type.trim().toLowerCase() === normalizedFilter)
    );
  }

  const q = search.trim().toLowerCase();
  if (q) {
    combined = combined.filter(
      (s) =>
        s.supplier_name.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.notes.toLowerCase().includes(q) ||
        s.items.some(
          (item) =>
            item.wood_type.toLowerCase().includes(q) ||
            item.unit_note.toLowerCase().includes(q)
        )
    );
  }

  return combined;
}

export async function createWoodSupplier(
  input: SaveWoodSupplierInput
): Promise<number> {
  const clean = validateWoodSupplierInput(input);
  const now = getLocalTimestampIso();

  return runInTransaction(async (txn) => {
    const res = await txn.runAsync(
      `INSERT INTO wood_suppliers (supplier_name, location, phone, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      clean.supplierName,
      clean.location,
      clean.phone,
      clean.notes,
      now,
      now
    );
    const supplierId = res.lastInsertRowId;

    for (const item of clean.items) {
      await txn.runAsync(
        `INSERT INTO wood_supplier_prices (supplier_id, wood_type, buy_price_m3, unit_note, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        supplierId,
        item.woodType,
        item.buyPriceM3,
        item.unitNote,
        now
      );
    }

    return supplierId;
  });
}

export async function updateWoodSupplier(
  id: number,
  input: SaveWoodSupplierInput
): Promise<void> {
  const clean = validateWoodSupplierInput(input);
  const now = getLocalTimestampIso();

  await runInTransaction(async (txn) => {
    const existing = await txn.getFirstAsync<WoodSupplier>(
      'SELECT * FROM wood_suppliers WHERE id = ?',
      id
    );
    if (!existing) {
      throw new Error('Data pemasok kayu tidak ditemukan.');
    }

    await txn.runAsync(
      `UPDATE wood_suppliers
       SET supplier_name = ?, location = ?, phone = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      clean.supplierName,
      clean.location,
      clean.phone,
      clean.notes,
      now,
      id
    );

    await txn.runAsync(
      'DELETE FROM wood_supplier_prices WHERE supplier_id = ?',
      id
    );

    for (const item of clean.items) {
      await txn.runAsync(
        `INSERT INTO wood_supplier_prices (supplier_id, wood_type, buy_price_m3, unit_note, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        id,
        item.woodType,
        item.buyPriceM3,
        item.unitNote,
        now
      );
    }
  });
}

export async function deleteWoodSupplier(id: number): Promise<void> {
  await runInTransaction(async (txn) => {
    await txn.runAsync('DELETE FROM wood_suppliers WHERE id = ?', id);
  });
}
