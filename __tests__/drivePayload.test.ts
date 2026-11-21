import {
  buildMultipartRelatedBody,
  isValidSqliteBase64Header,
  isValidSqliteBytes,
} from '../src/utils/drivePayload';

describe('drivePayload', () => {
  test('buildMultipartRelatedBody menyusun CRLF multipart/related dengan Content-Transfer-Encoding base64', () => {
    const body = buildMultipartRelatedBody(
      'test_boundary',
      { name: 'bukukayu_backup.db', parents: ['appDataFolder'] },
      'U1FMaXRlIGZvcm1hdCAzAA=='
    );

    expect(body).toContain('--test_boundary\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n');
    expect(body).toContain('"parents":["appDataFolder"]');
    expect(body).toContain(
      '--test_boundary\r\nContent-Type: application/x-sqlite3\r\nContent-Transfer-Encoding: base64\r\n\r\nU1FMaXRlIGZvcm1hdCAzAA=='
    );
    expect(body.endsWith('--test_boundary--\r\n')).toBe(true);
  });

  test('isValidSqliteBytes mendeteksi header SQLite format 3 secara akurat', () => {
    const encoder = new TextEncoder();
    const header = encoder.encode('SQLite format 3\0extra_data_here');
    expect(isValidSqliteBytes(header)).toBe(true);

    const invalid = encoder.encode('{"error":"unauthorized"}');
    expect(isValidSqliteBytes(invalid)).toBe(false);
    expect(isValidSqliteBytes(new Uint8Array([0x53, 0x51]))).toBe(false);
  });

  test('isValidSqliteBase64Header mengenali prefix base64 SQLite', () => {
    expect(isValidSqliteBase64Header('U1FMaXRlIGZvcm1hdCAzAA==')).toBe(true);
    expect(isValidSqliteBase64Header('eyJlcnJvciI6dHJ1ZX0=')).toBe(false);
  });
});
