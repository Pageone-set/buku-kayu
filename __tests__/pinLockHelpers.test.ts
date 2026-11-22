import {
  createPinRecord,
  formatAutoLockLabel,
  isValidPinFormat,
  sha256Hex,
  shouldAutoLock,
  verifyPinRecord,
} from '../src/utils/pinLockHelpers';

describe('pinLockHelpers', () => {
  test('sha256Hex menghasilkan digest standar SHA-256 yang akurat', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  test('isValidPinFormat hanya menerima tepat 6 angka', () => {
    expect(isValidPinFormat('123456')).toBe(true);
    expect(isValidPinFormat('007009')).toBe(true);
    expect(isValidPinFormat('12345')).toBe(false);
    expect(isValidPinFormat('1234567')).toBe(false);
    expect(isValidPinFormat('12345a')).toBe(false);
    expect(isValidPinFormat('')).toBe(false);
  });

  test('createPinRecord dan verifyPinRecord memvalidasi PIN dengan salt berbeda', () => {
    const record1 = createPinRecord('258096');
    const record2 = createPinRecord('258096', 'customsalt99');

    expect(record1).not.toBe(record2);
    expect(verifyPinRecord('258096', record1)).toBe(true);
    expect(verifyPinRecord('258096', record2)).toBe(true);
    expect(verifyPinRecord('111111', record1)).toBe(false);
    expect(verifyPinRecord('258096', null)).toBe(false);
    expect(verifyPinRecord('258096', 'invalid-record')).toBe(false);
  });

  test('shouldAutoLock menghormati jeda waktu kunci otomatis', () => {
    expect(shouldAutoLock(null, 100000, 0)).toBe(false);
    expect(shouldAutoLock(100000, 100100, 0)).toBe(true);
    expect(shouldAutoLock(100000, 129999, 30)).toBe(false);
    expect(shouldAutoLock(100000, 130000, 30)).toBe(true);
    expect(formatAutoLockLabel(0)).toBe('Langsung');
    expect(formatAutoLockLabel(30)).toBe('30 detik');
    expect(formatAutoLockLabel(60)).toBe('1 menit');
  });
});
