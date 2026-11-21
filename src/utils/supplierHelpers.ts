import {
  SaveWoodSupplierInput,
  WoodSupplierWithPrices,
} from '../types/domain';
import { normalizeWoodTypeName } from './woodPresetHelpers';

export interface ValidatedSupplierItem {
  woodType: string;
  buyPriceM3: number;
  unitNote: string;
}

export interface ValidatedSupplierInput {
  supplierName: string;
  location: string;
  phone: string;
  notes: string;
  items: ValidatedSupplierItem[];
}

export function validateWoodSupplierInput(
  input: SaveWoodSupplierInput
): ValidatedSupplierInput {
  const supplierName = normalizeWoodTypeName(input.supplierName);
  if (!supplierName) {
    throw new Error('Nama pemasok / tempat ambil kayu wajib diisi.');
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('Tambahkan minimal 1 jenis kayu yang dipasok.');
  }

  const items: ValidatedSupplierItem[] = input.items.map((item, index) => {
    const woodType = normalizeWoodTypeName(item.woodType);
    if (!woodType) {
      throw new Error(`Jenis kayu pada baris ke-${index + 1} wajib diisi.`);
    }
    if (!Number.isFinite(item.buyPriceM3) || item.buyPriceM3 < 0) {
      throw new Error(
        `Harga beli ${woodType} per m³ tidak boleh kurang dari Rp 0.`
      );
    }
    return {
      woodType,
      buyPriceM3: Math.round(item.buyPriceM3),
      unitNote: (item.unitNote ?? '').trim(),
    };
  });

  return {
    supplierName,
    location: (input.location ?? '').trim(),
    phone: (input.phone ?? '').trim(),
    notes: (input.notes ?? '').trim(),
    items,
  };
}

/**
 * Menghitung harga termurah per jenis kayu jika minimal 2 penawaran positif tersedia
 * across seluruh pemasok, agar bisa diberi lencana "Termurah".
 */
export function findLowestPriceByWoodType(
  suppliers: WoodSupplierWithPrices[]
): Record<string, number> {
  const grouped = new Map<string, number[]>();

  for (const supplier of suppliers) {
    for (const item of supplier.items) {
      if (item.buy_price_m3 <= 0) {
        continue;
      }
      const key = item.wood_type.trim().toLowerCase();
      const list = grouped.get(key) ?? [];
      list.push(item.buy_price_m3);
      grouped.set(key, list);
    }
  }

  const result: Record<string, number> = {};
  for (const [key, prices] of grouped.entries()) {
    if (prices.length >= 2) {
      result[key] = Math.min(...prices);
    }
  }
  return result;
}

export function normalizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  if (!digits) {
    return '';
  }
  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }
  if (digits.startsWith('8')) {
    return `62${digits}`;
  }
  return digits;
}
