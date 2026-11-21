import {
  buildDimensionLabel,
  calculatePriceMarginPerM3,
  formatDimensionNumber,
  normalizeWoodTypeName,
  validateWoodDimensionInput,
  validateWoodTypeInput,
} from '../src/utils/woodPresetHelpers';

describe('woodPresetHelpers', () => {
  test('formatDimensionNumber formats integers cleanly and preserves decimals', () => {
    expect(formatDimensionNumber(6)).toBe('6');
    expect(formatDimensionNumber(12.5)).toBe('12.5');
    expect(formatDimensionNumber(0)).toBe('0');
  });

  test('buildDimensionLabel auto-formats T x L or uses custom label', () => {
    expect(buildDimensionLabel(6, 12)).toBe('6×12');
    expect(buildDimensionLabel(2, 20, '2×20 (Papan)')).toBe('2×20 (Papan)');
    expect(buildDimensionLabel(3.5, 15, '   ')).toBe('3.5×15');
  });

  test('normalizeWoodTypeName collapses extra whitespace', () => {
    expect(normalizeWoodTypeName('  Jati   Belanda  ')).toBe('Jati Belanda');
  });

  test('validateWoodTypeInput accepts valid input with buy/sell prices and rejects negative', () => {
    expect(
      validateWoodTypeInput({
        name: ' Meranti  Merah ',
        colorHex: '#9E5438',
        defaultBuyPriceM3: 5800000,
        defaultPriceM3: 7500000,
      })
    ).toEqual({
      name: 'Meranti Merah',
      colorHex: '#9E5438',
      defaultBuyPriceM3: 5800000,
      defaultPriceM3: 7500000,
    });

    expect(() =>
      validateWoodTypeInput({
        name: '   ',
        colorHex: '#8B5A2B',
        defaultPriceM3: 0,
      })
    ).toThrow('Nama jenis kayu wajib diisi.');

    expect(() =>
      validateWoodTypeInput({
        name: 'Jati',
        colorHex: '#8B5A2B',
        defaultBuyPriceM3: -50,
        defaultPriceM3: 1000000,
      })
    ).toThrow();

    expect(() =>
      validateWoodTypeInput({
        name: 'Jati',
        colorHex: '#8B5A2B',
        defaultPriceM3: -100,
      })
    ).toThrow();
  });

  test('calculatePriceMarginPerM3 computes sell minus buy cleanly', () => {
    expect(calculatePriceMarginPerM3(9500000, 12000000)).toBe(2500000);
    expect(calculatePriceMarginPerM3(10000000, 9000000)).toBe(-1000000);
  });

  test('validateWoodDimensionInput validates positive T, L, P and builds label', () => {
    expect(
      validateWoodDimensionInput({
        thicknessCm: 5,
        widthCm: 10,
        defaultLengthCm: 400,
      })
    ).toEqual({
      label: '5×10',
      thicknessCm: 5,
      widthCm: 10,
      defaultLengthCm: 400,
    });

    expect(() =>
      validateWoodDimensionInput({
        thicknessCm: 0,
        widthCm: 12,
        defaultLengthCm: 400,
      })
    ).toThrow();

    expect(() =>
      validateWoodDimensionInput({
        thicknessCm: 6,
        widthCm: 12,
        defaultLengthCm: -10,
      })
    ).toThrow();
  });
});
