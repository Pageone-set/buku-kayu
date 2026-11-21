export interface CubicItemInput {
  lengthCm: number;
  widthCm: number;
  thicknessCm: number;
  qty: number;
  pricePerM3: number;
}

export interface CubicSaleTotals {
  totalVolumeM3: number;
  totalAmount: number;
}

const ROUND_6_FACTOR = 1_000_000;

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Menghitung volume kayu (m³) dengan rumus:
 * ((Panjang cm × Lebar cm × Tebal cm) / 1.000.000) × Jumlah Batang
 */
export function calculateVolumeM3(
  lengthCm: number,
  widthCm: number,
  thicknessCm: number,
  qty: number
): number {
  if (
    !isPositiveFinite(lengthCm) ||
    !isPositiveFinite(widthCm) ||
    !isPositiveFinite(thicknessCm) ||
    !isPositiveFinite(qty)
  ) {
    return 0;
  }

  const raw = ((lengthCm * widthCm * thicknessCm) / 1_000_000) * qty;
  return Math.round(raw * ROUND_6_FACTOR) / ROUND_6_FACTOR;
}

export function calculateItemSubtotal(volumeM3: number, pricePerM3: number): number {
  if (!Number.isFinite(volumeM3) || !Number.isFinite(pricePerM3)) {
    return 0;
  }
  const safeVolume = Math.max(0, volumeM3);
  const safePrice = Math.max(0, pricePerM3);
  return Math.round(safeVolume * safePrice);
}

export function calculateSaleTotals(items: readonly CubicItemInput[]): CubicSaleTotals {
  let volumeSum = 0;
  let amountSum = 0;

  for (const item of items) {
    const itemVolume = calculateVolumeM3(
      item.lengthCm,
      item.widthCm,
      item.thicknessCm,
      item.qty
    );
    const itemSubtotal = calculateItemSubtotal(itemVolume, item.pricePerM3);
    volumeSum += itemVolume;
    amountSum += itemSubtotal;
  }

  return {
    totalVolumeM3: Math.round(volumeSum * ROUND_6_FACTOR) / ROUND_6_FACTOR,
    totalAmount: Math.round(amountSum),
  };
}

export function calculateRemainingAmount(total: number, paid: number): number {
  const safeTotal = Number.isFinite(total) ? total : 0;
  const safePaid = Number.isFinite(paid) ? paid : 0;
  return Math.max(0, Math.round(safeTotal - safePaid));
}

export function calculateFurnitureNetEstimate(
  totalPrice: number,
  productionCost: number
): number {
  const safePrice = Number.isFinite(totalPrice) ? totalPrice : 0;
  const safeCost = Number.isFinite(productionCost) ? productionCost : 0;
  return Math.round(safePrice - safeCost);
}
