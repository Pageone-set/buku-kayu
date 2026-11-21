import { SaveWoodDimensionInput, SaveWoodTypeInput } from '../types/domain';

export interface WoodSwatchChoice {
  label: string;
  hex: string;
}

export const WOOD_SWATCH_PALETTE: readonly WoodSwatchChoice[] = [
  { label: 'Jati', hex: '#8B5A2B' },
  { label: 'Mahoni', hex: '#7A3528' },
  { label: 'Sengon', hex: '#D7BC91' },
  { label: 'Kamper', hex: '#B57C4A' },
  { label: 'Meranti', hex: '#9E5438' },
  { label: 'Bengkirai', hex: '#A66F2E' },
  { label: 'Ulin', hex: '#4E3629' },
  { label: 'Netral', hex: '#64748B' },
] as const;

export function formatDimensionNumber(val: number): string {
  if (!Number.isFinite(val) || val <= 0) {
    return '0';
  }
  const rounded = Math.round(val * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function buildDimensionLabel(
  thicknessCm: number,
  widthCm: number,
  customLabel?: string
): string {
  const trimmed = customLabel?.trim() ?? '';
  if (trimmed.length > 0) {
    return trimmed;
  }
  return `${formatDimensionNumber(thicknessCm)}×${formatDimensionNumber(widthCm)}`;
}

export function normalizeWoodTypeName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function calculatePriceMarginPerM3(
  buyPriceM3: number,
  sellPriceM3: number
): number {
  if (!Number.isFinite(buyPriceM3) || !Number.isFinite(sellPriceM3)) {
    return 0;
  }
  return Math.round(sellPriceM3 - buyPriceM3);
}

export function validateWoodTypeInput(input: SaveWoodTypeInput): {
  name: string;
  colorHex: string;
  defaultBuyPriceM3: number;
  defaultPriceM3: number;
} {
  const name = normalizeWoodTypeName(input.name);
  if (!name) {
    throw new Error('Nama jenis kayu wajib diisi.');
  }
  const buyPrice = input.defaultBuyPriceM3 ?? 0;
  if (!Number.isFinite(buyPrice) || buyPrice < 0) {
    throw new Error('Harga beli pasar per m³ tidak boleh kurang dari Rp 0.');
  }
  if (!Number.isFinite(input.defaultPriceM3) || input.defaultPriceM3 < 0) {
    throw new Error('Harga jual pasar per m³ tidak boleh kurang dari Rp 0.');
  }
  const colorHex = input.colorHex.trim() || '#8B5A2B';
  return {
    name,
    colorHex,
    defaultBuyPriceM3: Math.round(buyPrice),
    defaultPriceM3: Math.round(input.defaultPriceM3),
  };
}

export function validateWoodDimensionInput(input: SaveWoodDimensionInput): {
  label: string;
  thicknessCm: number;
  widthCm: number;
  defaultLengthCm: number;
} {
  if (!Number.isFinite(input.thicknessCm) || input.thicknessCm <= 0) {
    throw new Error('Tebal kayu (cm) harus lebih dari 0.');
  }
  if (!Number.isFinite(input.widthCm) || input.widthCm <= 0) {
    throw new Error('Lebar kayu (cm) harus lebih dari 0.');
  }
  if (!Number.isFinite(input.defaultLengthCm) || input.defaultLengthCm <= 0) {
    throw new Error('Panjang standar kayu (cm) harus lebih dari 0.');
  }
  const label = buildDimensionLabel(
    input.thicknessCm,
    input.widthCm,
    input.label
  );
  return {
    label,
    thicknessCm: input.thicknessCm,
    widthCm: input.widthCm,
    defaultLengthCm: input.defaultLengthCm,
  };
}
