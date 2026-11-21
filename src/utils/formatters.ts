const MONTHS_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

/**
 * Format angka ke format Rupiah Indonesia tanpa ketergantungan Intl Android Hermes.
 */
export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const isNegative = safe < 0;
  const absStr = Math.abs(safe).toString();
  const formatted = absStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

/**
 * Mengambil angka bulat dari input teks nominal Rupiah.
 */
export function parseRupiahInput(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) {
    return 0;
  }
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Format volume kubikasi kayu (m³) dengan koma desimal Indonesia.
 */
export function formatVolumeM3(volume: number, decimals = 4): string {
  const safe = Number.isFinite(volume) && volume > 0 ? volume : 0;
  const fixed = safe.toFixed(decimals);
  const [intPart, decPart = ''] = fixed.split('.');

  if (!decPart) {
    return `${intPart} m³`;
  }

  let trimmedDec = decPart.replace(/0+$/, '');
  if (trimmedDec.length < 3) {
    trimmedDec = decPart.slice(0, 3);
  }
  return `${intPart},${trimmedDec} m³`;
}

export function formatDimension(
  lengthCm: number,
  widthCm: number,
  thicknessCm: number
): string {
  return `${thicknessCm}×${widthCm} cm • P ${lengthCm} cm`;
}

export function formatShortDimension(widthCm: number, thicknessCm: number): string {
  return `${thicknessCm}×${widthCm} cm`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function getLocalDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function getTodayDatePrefix(): string {
  return getLocalDateString(new Date());
}

export function getOffsetDateString(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return getLocalDateString(date);
}

export type DeadlineDurationUnit = 'DAYS' | 'WEEKS' | 'MONTHS';

export function getOffsetDateByDuration(
  amount: number,
  unit: DeadlineDurationUnit,
  baseDate: Date = new Date()
): string {
  const safeAmount = Number.isFinite(amount)
    ? Math.max(0, Math.round(amount))
    : 0;
  const result = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate()
  );

  if (unit === 'DAYS') {
    result.setDate(result.getDate() + safeAmount);
    return getLocalDateString(result);
  }
  if (unit === 'WEEKS') {
    result.setDate(result.getDate() + safeAmount * 7);
    return getLocalDateString(result);
  }

  // Clamp day-of-month so e.g. Jan 31 + 1 month lands on Feb 28/29 rather than March
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + safeAmount);
  const lastDayOfTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0
  ).getDate();
  result.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  return getLocalDateString(result);
}

export function isValidIsoDateString(dateString: string): boolean {
  const trimmed = dateString.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

export function calculateDaysFromToday(
  dateString: string,
  today: Date = new Date()
): number | null {
  if (!isValidIsoDateString(dateString)) {
    return null;
  }
  const [y, m, d] = dateString.trim().split('-').map(Number);
  const targetMidnight = new Date(y, m - 1, d).getTime();
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();
  return Math.round((targetMidnight - todayMidnight) / 86_400_000);
}

export function getLocalTimestampIso(date: Date = new Date()): string {
  const tzOffsetMin = -date.getTimezoneOffset();
  const sign = tzOffsetMin >= 0 ? '+' : '-';
  const absOffset = Math.abs(tzOffsetMin);
  const offsetHours = pad2(Math.floor(absOffset / 60));
  const offsetMinutes = pad2(absOffset % 60);

  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}` +
    `${sign}${offsetHours}:${offsetMinutes}`
  );
}

export function formatDateIndo(dateString: string): string {
  if (!dateString) {
    return '-';
  }

  // Handle plain YYYY-MM-DD safely without timezone shift
  const plainMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString.trim());
  if (plainMatch) {
    const year = Number(plainMatch[1]);
    const monthIdx = Number(plainMatch[2]) - 1;
    const day = Number(plainMatch[3]);
    const monthName = MONTHS_ID[monthIdx] ?? '';
    return `${day} ${monthName} ${year}`;
  }

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }
  return `${parsed.getDate()} ${MONTHS_ID[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

const FULL_MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export function formatMonthYearIndo(year: number, monthIndex: number): string {
  const safeIndex = ((monthIndex % 12) + 12) % 12;
  return `${FULL_MONTHS_ID[safeIndex]} ${year}`;
}

export function formatDateTimeIndo(isoString: string): string {
  if (!isoString) {
    return '-';
  }
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return isoString;
  }
  const time = `${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;
  return `${formatDateIndo(isoString)}, ${time}`;
}

export function formatBackupRelativeTime(isoString: string | null): string {
  if (!isoString) {
    return 'Belum pernah dicadangkan';
  }
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return 'Belum pernah dicadangkan';
  }

  const now = new Date();
  const todayStr = getLocalDateString(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const targetStr = getLocalDateString(parsed);
  const time = `${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;

  if (targetStr === todayStr) {
    return `Hari ini, ${time}`;
  }
  if (targetStr === yesterdayStr) {
    return `Kemarin, ${time}`;
  }
  return `${formatDateIndo(targetStr)}, ${time}`;
}

export function formatBytesSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1).replace('.', ',')} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(2).replace('.', ',')} MB`;
}

export function generateInvoiceNumber(prefix: 'KY' | 'FR', date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${y}${m}${d}-${rand}`;
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

const MAX_SAFE_FILE_BASE_LENGTH = 80;

export function buildSafeFileName(rawName: string, extension: string): string {
  const cleanExt = extension.replace(/^\.+/, '').trim().toLowerCase();
  let trimmed = rawName.trim();

  if (cleanExt) {
    const escapedExt = cleanExt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    trimmed = trimmed.replace(new RegExp(`\\.${escapedExt}$`, 'i'), '');
  }

  let base = trimmed
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '');

  if (base.length > MAX_SAFE_FILE_BASE_LENGTH) {
    base = base.slice(0, MAX_SAFE_FILE_BASE_LENGTH).replace(/[_-]+$/g, '');
  }

  if (!base) {
    base = 'BukuKayu_Dokumen';
  }

  return cleanExt ? `${base}.${cleanExt}` : base;
}
