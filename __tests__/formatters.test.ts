import {
  calculateDaysFromToday,
  formatBackupRelativeTime,
  formatBytesSize,
  formatDateIndo,
  formatDimension,
  formatRupiah,
  formatVolumeM3,
  generateInvoiceNumber,
  getOffsetDateByDuration,
  isValidIsoDateString,
  normalizeWhatsAppPhone,
  parseRupiahInput,
} from '../src/utils/formatters';

describe('formatters', () => {
  test('formatRupiah memformat angka positif dan negatif dengan pemisah titik', () => {
    expect(formatRupiah(0)).toBe('Rp 0');
    expect(formatRupiah(1250000)).toBe('Rp 1.250.000');
    expect(formatRupiah(-250000)).toBe('-Rp 250.000');
  });

  test('parseRupiahInput mengambil hanya digit menjadi angka bulat', () => {
    expect(parseRupiahInput('Rp 1.250.000')).toBe(1250000);
    expect(parseRupiahInput('abc')).toBe(0);
    expect(parseRupiahInput('')).toBe(0);
  });

  test('formatVolumeM3 menggunakan koma desimal Indonesia', () => {
    expect(formatVolumeM3(0.288)).toBe('0,288 m³');
    expect(formatVolumeM3(0.0288)).toBe('0,0288 m³');
    expect(formatVolumeM3(1.5)).toBe('1,500 m³');
  });

  test('formatDimension dan formatBytesSize tampil rapi', () => {
    expect(formatDimension(400, 12, 6)).toBe('6×12 cm • P 400 cm');
    expect(formatBytesSize(512)).toBe('512 B');
    expect(formatBytesSize(2048)).toBe('2,0 KB');
  });

  test('normalizeWhatsAppPhone mengubah 08xx menjadi 628xx', () => {
    expect(normalizeWhatsAppPhone('0812-3456-7890')).toBe('6281234567890');
    expect(normalizeWhatsAppPhone('+62 813 1111 2222')).toBe('6281311112222');
    expect(normalizeWhatsAppPhone('812999888')).toBe('62812999888');
  });

  test('generateInvoiceNumber sesuai pola prefix tanggal', () => {
    const fixedDate = new Date(2026, 10, 21, 10, 0, 0);
    expect(generateInvoiceNumber('KY', fixedDate)).toMatch(/^KY-20261121-\d{4}$/);
    expect(generateInvoiceNumber('FR', fixedDate)).toMatch(/^FR-20261121-\d{4}$/);
  });

  test('formatDateIndo dan formatBackupRelativeTime memformat tanggal lokal', () => {
    expect(formatDateIndo('2026-11-21')).toBe('21 Nov 2026');
    expect(formatBackupRelativeTime(null)).toBe('Belum pernah dicadangkan');
  });

  test('getOffsetDateByDuration mendukung hari, minggu, dan bulan termasuk batas akhir bulan', () => {
    const base = new Date(2026, 0, 31, 10, 0, 0); // 31 Jan 2026
    expect(getOffsetDateByDuration(45, 'DAYS', base)).toBe('2026-03-17');
    expect(getOffsetDateByDuration(6, 'WEEKS', base)).toBe('2026-03-14');
    expect(getOffsetDateByDuration(1, 'MONTHS', base)).toBe('2026-02-28');
    expect(getOffsetDateByDuration(3, 'MONTHS', base)).toBe('2026-04-30');
  });

  test('isValidIsoDateString dan calculateDaysFromToday memvalidasi tanggal secara akurat', () => {
    expect(isValidIsoDateString('2026-12-22')).toBe(true);
    expect(isValidIsoDateString('2026-02-30')).toBe(false);
    expect(isValidIsoDateString('22-12-2026')).toBe(false);

    const today = new Date(2026, 10, 22, 15, 30, 0); // 22 Nov 2026
    expect(calculateDaysFromToday('2026-11-22', today)).toBe(0);
    expect(calculateDaysFromToday('2027-01-06', today)).toBe(45);
    expect(calculateDaysFromToday('2026-11-20', today)).toBe(-2);
    expect(calculateDaysFromToday('2026-02-30', today)).toBeNull();
  });
});
