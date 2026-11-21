import {
  CASH_FLOW_CATEGORY_LABELS,
  CashFlow,
  CashFlowCategory,
  CashFlowSummary,
  FURNITURE_PAYMENT_TYPE_LABELS,
  FURNITURE_STATUS_LABELS,
  FurnitureOrderDetail,
  WoodSaleDetail,
} from '../types/domain';
import { calculateRemainingAmount } from './cubicCalculator';
import {
  formatDateIndo,
  formatDateTimeIndo,
  formatDimension,
  formatMonthYearIndo,
  formatRupiah,
  formatVolumeM3,
} from './formatters';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildWoodSaleWhatsAppText(
  sale: WoodSaleDetail,
  workshopName: string
): string {
  const remaining = calculateRemainingAmount(sale.total_amount, sale.paid_amount);
  const statusLabel =
    sale.payment_status === 'PAID' && remaining === 0
      ? 'LUNAS'
      : 'KASBON / KURANG BAYAR';

  const lines: string[] = [
    `*NOTA PENJUALAN KAYU*`,
    `*${workshopName}*`,
    `No. Nota: ${sale.invoice_number}`,
    `Tanggal: ${formatDateTimeIndo(sale.created_at)}`,
    `Pembeli: ${sale.customer_name || 'Pembeli Umum'}`,
    `--------------------------------`,
  ];

  sale.items.forEach((item, index) => {
    lines.push(
      `${index + 1}. *${item.wood_type}* (${formatDimension(
        item.length_cm,
        item.width_cm,
        item.thickness_cm
      )})`
    );
    lines.push(
      `   ${item.qty} btg • ${formatVolumeM3(item.volume_m3)} × ${formatRupiah(
        item.price_per_m3
      )}/m³ = *${formatRupiah(item.subtotal)}*`
    );
  });

  lines.push(`--------------------------------`);
  lines.push(`Total Volume: *${formatVolumeM3(sale.total_volume_m3)}*`);
  lines.push(`Total Harga: *${formatRupiah(sale.total_amount)}*`);
  lines.push(`Sudah Dibayar: ${formatRupiah(sale.paid_amount)}`);
  if (remaining > 0) {
    lines.push(`Kurang Bayar: *${formatRupiah(remaining)}*`);
  }
  lines.push(`Status: *${statusLabel}*`);
  if (sale.notes) {
    lines.push(`Catatan: ${sale.notes}`);
  }
  lines.push(`\nTerima kasih sudah berbelanja di ${workshopName}.`);

  return lines.join('\n');
}

export function buildWoodSaleReceiptHtml(
  sale: WoodSaleDetail,
  workshopName: string
): string {
  const remaining = calculateRemainingAmount(sale.total_amount, sale.paid_amount);
  const isPaid = sale.payment_status === 'PAID' && remaining === 0;

  const itemRows = sale.items
    .map(
      (item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <strong>${escapeHtml(item.wood_type)}</strong><br/>
          <span class="muted">${escapeHtml(
            formatDimension(item.length_cm, item.width_cm, item.thickness_cm)
          )}</span>
        </td>
        <td class="right">${item.qty} btg</td>
        <td class="right">${escapeHtml(formatVolumeM3(item.volume_m3))}</td>
        <td class="right">${escapeHtml(formatRupiah(item.price_per_m3))}</td>
        <td class="right"><strong>${escapeHtml(formatRupiah(item.subtotal))}</strong></td>
      </tr>
    `
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Arial, sans-serif; color: #222831; padding: 24px; font-size: 13px; background: #F7F9FB; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0A3C6E; padding-bottom: 12px; margin-bottom: 16px; }
  .title { font-size: 20px; font-weight: bold; color: #0A3C6E; margin: 0; }
  .subtitle { font-size: 13px; color: #5A6675; margin-top: 4px; }
  .badge { display: inline-block; padding: 6px 14px; border-radius: 999px; font-weight: bold; font-size: 12px; background: ${
    isPaid ? '#EAF7EF' : '#FDECEC'
  }; color: ${isPaid ? '#15803D' : '#C0392B'}; }
  .meta { margin-bottom: 16px; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; background: #FFFFFF; }
  th { background: #EFF3F7; text-align: left; padding: 8px; border-bottom: 2px solid #E6ECF2; font-size: 12px; color: #222831; }
  td { padding: 8px; border-bottom: 1px solid #EFF3F7; vertical-align: top; }
  .right { text-align: right; }
  .muted { color: #8B97A6; font-size: 11px; }
  .summary { width: 320px; margin-left: auto; border: 1px solid #E6ECF2; border-radius: 12px; padding: 12px; background: #FFFFFF; }
  .summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
  .summary-total { font-size: 16px; font-weight: bold; border-top: 1px solid #E6ECF2; padding-top: 8px; margin-top: 6px; }
  .footer { margin-top: 24px; font-size: 11px; color: #8B97A6; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <p class="title">${escapeHtml(workshopName)}</p>
      <div class="subtitle">Nota Penjualan Kayu</div>
    </div>
    <div style="text-align: right;">
      <div class="badge">${isPaid ? 'LUNAS' : 'KASBON / KURANG BAYAR'}</div>
      <div class="subtitle" style="margin-top: 6px;">${escapeHtml(sale.invoice_number)}</div>
    </div>
  </div>

  <div class="meta">
    <div><strong>Pembeli:</strong> ${escapeHtml(sale.customer_name || 'Pembeli Umum')}</div>
    ${
      sale.customer_phone
        ? `<div><strong>No. WA:</strong> ${escapeHtml(sale.customer_phone)}</div>`
        : ''
    }
    <div><strong>Tanggal:</strong> ${escapeHtml(formatDateTimeIndo(sale.created_at))}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>No</th>
        <th>Kayu & Ukuran</th>
        <th class="right">Batang</th>
        <th class="right">Volume</th>
        <th class="right">Harga/m³</th>
        <th class="right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-row">
      <span>Total Kubikasi</span>
      <strong>${escapeHtml(formatVolumeM3(sale.total_volume_m3))}</strong>
    </div>
    <div class="summary-row">
      <span>Total Harga</span>
      <strong>${escapeHtml(formatRupiah(sale.total_amount))}</strong>
    </div>
    <div class="summary-row">
      <span>Sudah Dibayar</span>
      <span>${escapeHtml(formatRupiah(sale.paid_amount))}</span>
    </div>
    ${
      remaining > 0
        ? `<div class="summary-row summary-total" style="color: #C0392B;">
            <span>Kurang Bayar</span>
            <span>${escapeHtml(formatRupiah(remaining))}</span>
          </div>`
        : `<div class="summary-row summary-total" style="color: #15803D;">
            <span>Status</span>
            <span>LUNAS</span>
          </div>`
    }
  </div>

  ${
    sale.notes
      ? `<p style="margin-top: 12px;"><strong>Catatan:</strong> ${escapeHtml(sale.notes)}</p>`
      : ''
  }

  <div class="footer">Dicetak dari aplikasi BukuKayu</div>
</body>
</html>`;
}

export function buildFurnitureOrderWhatsAppText(
  order: FurnitureOrderDetail,
  workshopName: string
): string {
  const remaining = calculateRemainingAmount(order.total_price, order.paid_amount);
  const statusText = FURNITURE_STATUS_LABELS[order.status];

  const lines: string[] = [
    `*NOTA ORDERAN FURNITURE*`,
    `*${workshopName}*`,
    `Kode Order: ${order.order_code}`,
    `Pelanggan: ${order.customer_name}`,
    `Pesanan: *${order.item_name}*`,
    `Status Pengerjaan: *${statusText}*`,
    `Perkiraan Selesai: *${formatDateIndo(order.deadline_date)}*`,
    `_(Waktu pengerjaan merupakan perkiraan dan dapat menyesuaikan kondisi bengkel)_`,
    `--------------------------------`,
    `Harga Total: *${formatRupiah(order.total_price)}*`,
    `Sudah Dibayar: ${formatRupiah(order.paid_amount)}`,
    remaining > 0
      ? `Sisa Tagihan: *${formatRupiah(remaining)}*`
      : `Status Bayar: *LUNAS*`,
  ];

  if (order.payments.length > 0) {
    lines.push(`--------------------------------`);
    lines.push(`Riwayat Pembayaran:`);
    order.payments.forEach((pay, idx) => {
      lines.push(
        `${idx + 1}. ${FURNITURE_PAYMENT_TYPE_LABELS[pay.payment_type]} (${formatDateIndo(
          pay.payment_date
        )}): ${formatRupiah(pay.amount)}`
      );
    });
  }

  lines.push(`\nTerima kasih telah memesan di ${workshopName}.`);
  return lines.join('\n');
}

export function buildFurnitureOrderReceiptHtml(
  order: FurnitureOrderDetail,
  workshopName: string
): string {
  const remaining = calculateRemainingAmount(order.total_price, order.paid_amount);
  const isPaid = remaining === 0;

  const paymentRows =
    order.payments.length > 0
      ? order.payments
          .map(
            (pay, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${escapeHtml(FURNITURE_PAYMENT_TYPE_LABELS[pay.payment_type])}</td>
            <td>${escapeHtml(formatDateIndo(pay.payment_date))}</td>
            <td>${escapeHtml(pay.note || '-')}</td>
            <td class="right"><strong>${escapeHtml(formatRupiah(pay.amount))}</strong></td>
          </tr>
        `
          )
          .join('')
      : `<tr><td colspan="5" style="text-align:center;color:#64748B;">Belum ada pembayaran masuk</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  @page { margin: 16px; }
  body { font-family: Arial, sans-serif; color: #222831; padding: 20px; font-size: 13px; background: #F7F9FB; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0A3C6E; padding-bottom: 12px; margin-bottom: 16px; }
  .title { font-size: 20px; font-weight: bold; color: #0A3C6E; margin: 0; }
  .subtitle { font-size: 13px; color: #5A6675; margin-top: 4px; }
  .badge { display: inline-block; padding: 6px 14px; border-radius: 999px; font-weight: bold; font-size: 12px; background: ${
    isPaid ? '#EAF7EF' : '#E8F4FC'
  }; color: ${isPaid ? '#15803D' : '#0A3C6E'}; }
  .box { border: 1px solid #E6ECF2; border-radius: 12px; padding: 14px; margin-bottom: 16px; background: #FFFFFF; line-height: 1.7; }
  .note-muted { font-size: 11px; color: #5A6675; font-style: italic; margin-top: 2px; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; background: #FFFFFF; }
  th { background: #EFF3F7; text-align: left; padding: 8px; border-bottom: 2px solid #E6ECF2; font-size: 12px; color: #222831; }
  td { padding: 8px; border-bottom: 1px solid #EFF3F7; }
  .right { text-align: right; }
  .footer { margin-top: 24px; font-size: 11px; color: #8B97A6; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <p class="title">${escapeHtml(workshopName)}</p>
      <div class="subtitle">Nota Orderan Furniture Custom</div>
    </div>
    <div style="text-align: right;">
      <div class="badge">${isPaid ? 'LUNAS' : 'BELUM LUNAS'}</div>
      <div class="subtitle" style="margin-top: 6px;">${escapeHtml(order.order_code)}</div>
    </div>
  </div>

  <div class="box">
    <div><strong>Pelanggan:</strong> ${escapeHtml(order.customer_name)}</div>
    ${
      order.customer_phone
        ? `<div><strong>No. WA:</strong> ${escapeHtml(order.customer_phone)}</div>`
        : ''
    }
    <div><strong>Pesanan:</strong> ${escapeHtml(order.item_name)}</div>
    <div><strong>Status Pengerjaan:</strong> ${escapeHtml(
      FURNITURE_STATUS_LABELS[order.status]
    )}</div>
    <div><strong>Perkiraan Selesai:</strong> ${escapeHtml(
      formatDateIndo(order.deadline_date)
    )}</div>
    <div class="note-muted">*Waktu pengerjaan merupakan perkiraan dan dapat berubah menyesuaikan kondisi bengkel.</div>
    <div><strong>Harga Total:</strong> ${escapeHtml(formatRupiah(order.total_price))}</div>
    <div><strong>Sudah Dibayar:</strong> ${escapeHtml(formatRupiah(order.paid_amount))}</div>
    <div><strong>Sisa Tagihan:</strong> <span style="color:${
      remaining > 0 ? '#C0392B' : '#15803D'
    };font-weight:bold;">${escapeHtml(formatRupiah(remaining))}</span></div>
  </div>

  <h3>Riwayat Pembayaran</h3>
  <table>
    <thead>
      <tr>
        <th>No</th>
        <th>Jenis</th>
        <th>Tanggal</th>
        <th>Catatan</th>
        <th class="right">Nominal</th>
      </tr>
    </thead>
    <tbody>
      ${paymentRows}
    </tbody>
  </table>

  <div class="footer">Dicetak dari aplikasi BukuKayu</div>
</body>
</html>`;
}

export interface MonthlyCashFlowExportData {
  workshopName: string;
  year: number;
  monthIndex: number;
  rows: CashFlow[];
  summary: CashFlowSummary;
  categoryTotals: Record<CashFlowCategory, number>;
}

const ORDERED_CATEGORIES: readonly CashFlowCategory[] = [
  'WOOD_SALE',
  'FURNITURE_PAYMENT',
  'MATERIAL_BUY',
  'LABOR_WAGE',
  'OPERATIONAL',
  'PERSONAL_DRAW',
];

export function buildMonthlyCashFlowReportHtml(
  data: MonthlyCashFlowExportData
): string {
  const periodLabel = formatMonthYearIndo(data.year, data.monthIndex);

  const categoryRows = ORDERED_CATEGORIES.map((cat) => {
    const total = data.categoryTotals[cat] ?? 0;
    const isIncome = cat === 'WOOD_SALE' || cat === 'FURNITURE_PAYMENT';
    return `
      <tr>
        <td>${escapeHtml(CASH_FLOW_CATEGORY_LABELS[cat])}</td>
        <td class="right" style="color:${
          isIncome ? '#15803D' : '#C0392B'
        };font-weight:bold;">
          ${isIncome ? '+' : '-'}${escapeHtml(formatRupiah(total))}
        </td>
      </tr>
    `;
  }).join('');

  const transactionRows =
    data.rows.length > 0
      ? data.rows
          .map((row, idx) => {
            const isIn = row.type === 'IN';
            return `
            <tr>
              <td>${idx + 1}</td>
              <td>${escapeHtml(formatDateTimeIndo(row.created_at))}</td>
              <td>${escapeHtml(CASH_FLOW_CATEGORY_LABELS[row.category])}</td>
              <td>
                <strong>${escapeHtml(row.description)}</strong>
                ${
                  row.reference_id
                    ? `<br/><span class="muted">${escapeHtml(row.reference_id)}</span>`
                    : ''
                }
              </td>
              <td class="right" style="color:#15803D;font-weight:bold;">
                ${isIn ? escapeHtml(formatRupiah(row.amount)) : '-'}
              </td>
              <td class="right" style="color:#C0392B;font-weight:bold;">
                ${!isIn ? escapeHtml(formatRupiah(row.amount)) : '-'}
              </td>
            </tr>
          `;
          })
          .join('')
      : `<tr><td colspan="6" style="text-align:center;color:#5A6675;">Belum ada transaksi di bulan ${escapeHtml(
          periodLabel
        )}.</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  @page { margin: 16px; }
  body { font-family: Arial, sans-serif; color: #222831; padding: 20px; font-size: 12px; background: #F7F9FB; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0A3C6E; padding-bottom: 12px; margin-bottom: 16px; }
  .title { font-size: 20px; font-weight: bold; color: #0A3C6E; margin: 0; }
  .subtitle { font-size: 13px; color: #5A6675; margin-top: 4px; }
  .period-pill { background: #EAF2FA; color: #0A3C6E; font-weight: bold; padding: 6px 14px; border-radius: 999px; font-size: 12px; }
  .grid { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
  .metric { flex: 1; min-width: 120px; background: #FFFFFF; border: 1px solid #E6ECF2; border-radius: 12px; padding: 10px 12px; }
  .metric-label { font-size: 11px; color: #5A6675; margin-bottom: 4px; }
  .metric-val { font-size: 15px; font-weight: bold; }
  h3 { font-size: 14px; color: #0A3C6E; margin: 16px 0 8px; }
  table { width: 100%; border-collapse: collapse; background: #FFFFFF; margin-bottom: 14px; }
  th { background: #EFF3F7; text-align: left; padding: 8px; border-bottom: 2px solid #E6ECF2; font-size: 11px; color: #222831; }
  td { padding: 7px 8px; border-bottom: 1px solid #EFF3F7; vertical-align: top; }
  .right { text-align: right; }
  .muted { color: #8B97A6; font-size: 10px; }
  .footer { margin-top: 20px; font-size: 11px; color: #8B97A6; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <p class="title">${escapeHtml(data.workshopName)}</p>
      <div class="subtitle">Laporan Catatan Keuangan Bulanan</div>
    </div>
    <div class="period-pill">${escapeHtml(periodLabel)}</div>
  </div>

  <div class="grid">
    <div class="metric">
      <div class="metric-label">Total Uang Masuk</div>
      <div class="metric-val" style="color:#15803D;">+${escapeHtml(
        formatRupiah(data.summary.totalIn)
      )}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Pengeluaran Usaha</div>
      <div class="metric-val" style="color:#C0392B;">-${escapeHtml(
        formatRupiah(data.summary.businessOut)
      )}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Sisa Bersih Usaha</div>
      <div class="metric-val" style="color:${
        data.summary.businessNet >= 0 ? '#15803D' : '#C0392B'
      };">${escapeHtml(formatRupiah(data.summary.businessNet))}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Ambil Pribadi (Prive)</div>
      <div class="metric-val" style="color:#1783C1;">-${escapeHtml(
        formatRupiah(data.summary.personalDrawOut)
      )}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Sisa Uang di Kas</div>
      <div class="metric-val" style="color:#0A3C6E;">${escapeHtml(
        formatRupiah(data.summary.cashBalance)
      )}</div>
    </div>
  </div>

  <h3>Ringkasan per Kategori</h3>
  <table>
    <thead>
      <tr>
        <th>Kategori</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${categoryRows}
    </tbody>
  </table>

  <h3>Rincian Catatan Keuangan (${data.rows.length} transaksi)</h3>
  <table>
    <thead>
      <tr>
        <th>No</th>
        <th>Waktu</th>
        <th>Kategori</th>
        <th>Keterangan</th>
        <th class="right">Uang Masuk</th>
        <th class="right">Uang Keluar</th>
      </tr>
    </thead>
    <tbody>
      ${transactionRows}
    </tbody>
  </table>

  <div class="footer">Dicetak dari aplikasi BukuKayu</div>
</body>
</html>`;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildMonthlyCashFlowCsv(
  data: MonthlyCashFlowExportData
): string {
  const periodLabel = formatMonthYearIndo(data.year, data.monthIndex);
  const lines: string[] = [
    ['Laporan Catatan Keuangan Bulanan', data.workshopName].map(escapeCsvCell).join(','),
    ['Bulan', periodLabel].map(escapeCsvCell).join(','),
    '',
    ['No', 'Waktu', 'Jenis', 'Kategori', 'Keterangan', 'Referensi', 'Uang Masuk', 'Uang Keluar']
      .map(escapeCsvCell)
      .join(','),
  ];

  data.rows.forEach((row, idx) => {
    const isIn = row.type === 'IN';
    lines.push(
      [
        idx + 1,
        formatDateTimeIndo(row.created_at),
        isIn ? 'Uang Masuk' : 'Uang Keluar',
        CASH_FLOW_CATEGORY_LABELS[row.category],
        row.description,
        row.reference_id || '',
        isIn ? row.amount : 0,
        !isIn ? row.amount : 0,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  });

  lines.push('');
  lines.push(['Total Uang Masuk', data.summary.totalIn].map(escapeCsvCell).join(','));
  lines.push(['Pengeluaran Usaha', data.summary.businessOut].map(escapeCsvCell).join(','));
  lines.push(['Sisa Bersih Usaha', data.summary.businessNet].map(escapeCsvCell).join(','));
  lines.push(['Ambil Pribadi (Prive)', data.summary.personalDrawOut].map(escapeCsvCell).join(','));
  lines.push(['Sisa Uang di Kas', data.summary.cashBalance].map(escapeCsvCell).join(','));

  // UTF-8 BOM agar Excel langsung membaca karakter Indonesia secara rapi
  return `\uFEFF${lines.join('\r\n')}`;
}
