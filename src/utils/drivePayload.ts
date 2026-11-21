const SQLITE_MAGIC_BYTES = [
  0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66,
  0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00,
] as const;

/**
 * Menyusun body multipart/related sesuai RFC 2387 untuk Google Drive API v3
 * dengan header Content-Transfer-Encoding: base64 agar file .db biner aman.
 */
export function buildMultipartRelatedBody(
  boundary: string,
  metadata: Record<string, unknown>,
  base64Content: string,
  mimeType = 'application/x-sqlite3'
): string {
  const CRLF = '\r\n';
  const cleanBase64 = base64Content.replace(/\s+/g, '');

  return [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    'Content-Transfer-Encoding: base64',
    '',
    cleanBase64,
    `--${boundary}--`,
    '',
  ].join(CRLF);
}

/**
 * Memvalidasi 16 byte pertama file biner adalah header "SQLite format 3\0".
 */
export function isValidSqliteBytes(bytes: Uint8Array): boolean {
  if (bytes.length < SQLITE_MAGIC_BYTES.length) {
    return false;
  }
  for (let i = 0; i < SQLITE_MAGIC_BYTES.length; i += 1) {
    if (bytes[i] !== SQLITE_MAGIC_BYTES[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Memvalidasi awalan string base64 berasal dari file SQLite ("U1FMaXRlIGZvcm1hdCAzAA==").
 */
export function isValidSqliteBase64Header(base64Prefix: string): boolean {
  const expectedPrefix = 'U1FMaXRlIGZvcm1hdCAzAA';
  return base64Prefix.trim().startsWith(expectedPrefix);
}
