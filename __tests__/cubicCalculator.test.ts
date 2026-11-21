import {
  calculateFurnitureNetEstimate,
  calculateItemSubtotal,
  calculateRemainingAmount,
  calculateSaleTotals,
  calculateVolumeM3,
} from '../src/utils/cubicCalculator';

describe('cubicCalculator', () => {
  test('menghitung kubikasi balok 6x12 panjang 400 cm untuk 10 batang', () => {
    const volume = calculateVolumeM3(400, 12, 6, 10);
    expect(volume).toBe(0.288);
  });

  test('menghitung kubikasi papan 2x20 panjang 300 cm untuk 25 batang', () => {
    const volume = calculateVolumeM3(300, 20, 2, 25);
    expect(volume).toBe(0.3);
  });

  test('menghindari noise floating point untuk pecahan desimal kecil', () => {
    const volume = calculateVolumeM3(350, 11, 5, 7);
    expect(volume).toBe(0.13475);
  });

  test('mengembalikan 0 jika input tidak valid atau <= 0', () => {
    expect(calculateVolumeM3(0, 12, 6, 10)).toBe(0);
    expect(calculateVolumeM3(400, -12, 6, 10)).toBe(0);
    expect(calculateVolumeM3(400, 12, 6, 0)).toBe(0);
    expect(calculateVolumeM3(Number.NaN, 12, 6, 10)).toBe(0);
  });

  test('menghitung subtotal harga dibulatkan ke Rupiah terdekat', () => {
    expect(calculateItemSubtotal(0.288, 12000000)).toBe(3456000);
    expect(calculateItemSubtotal(0.13475, 8500000)).toBe(1145375);
    expect(calculateItemSubtotal(0.288, -1000)).toBe(0);
  });

  test('menghitung total volume dan total rupiah dari beberapa ukuran dalam 1 nota', () => {
    const totals = calculateSaleTotals([
      { lengthCm: 400, widthCm: 12, thicknessCm: 6, qty: 10, pricePerM3: 12000000 },
      { lengthCm: 400, widthCm: 20, thicknessCm: 2, qty: 15, pricePerM3: 5600000 },
    ]);

    expect(totals.totalVolumeM3).toBe(0.528);
    expect(totals.totalAmount).toBe(3456000 + 1344000);
  });

  test('menghitung sisa kurang bayar dan perkiraan untung bersih furniture', () => {
    expect(calculateRemainingAmount(5000000, 2000000)).toBe(3000000);
    expect(calculateRemainingAmount(5000000, 6000000)).toBe(0);
    expect(calculateFurnitureNetEstimate(7500000, 4200000)).toBe(3300000);
    expect(calculateFurnitureNetEstimate(3000000, 3500000)).toBe(-500000);
  });
});
