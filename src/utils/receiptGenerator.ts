import {
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
  body { font-family: Arial, sans-serif; color: #0F172A; padding: 24px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #B45309; padding-bottom: 12px; margin-bottom: 16px; }
  .title { font-size: 20px; font-weight: bold; color: #B45309; margin: 0; }
  .subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
  .badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 12px; background: ${
    isPaid ? '#DCFCE7' : '#FEE2E2'
  }; color: ${isPaid ? '#15803D' : '#B91C1C'}; }
  .meta { margin-bottom: 16px; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #F1F5F9; text-align: left; padding: 8px; border-bottom: 2px solid #CBD5E1; font-size: 12px; }
  td { padding: 8px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }
  .right { text-align: right; }
  .muted { color: #64748B; font-size: 11px; }
  .summary { width: 320px; margin-left: auto; border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px; background: #F8FAFC; }
  .summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
  .summary-total { font-size: 16px; font-weight: bold; border-top: 1px solid #CBD5E1; padding-top: 8px; margin-top: 6px; }
  .footer { margin-top: 24px; font-size: 11px; color: #64748B; text-align: center; }
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
        ? `<div class="summary-row summary-total" style="color: #B91C1C;">
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
    `Target Selesai: ${formatDateIndo(order.deadline_date)}`,
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
  body { font-family: Arial, sans-serif; color: #0F172A; padding: 24px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #B45309; padding-bottom: 12px; margin-bottom: 16px; }
  .title { font-size: 20px; font-weight: bold; color: #B45309; margin: 0; }
  .subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
  .badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 12px; background: ${
    isPaid ? '#DCFCE7' : '#FEF3C7'
  }; color: ${isPaid ? '#15803D' : '#92400E'}; }
  .box { border: 1px solid #CBD5E1; border-radius: 8px; padding: 14px; margin-bottom: 16px; background: #F8FAFC; line-height: 1.7; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #F1F5F9; text-align: left; padding: 8px; border-bottom: 2px solid #CBD5E1; font-size: 12px; }
  td { padding: 8px; border-bottom: 1px solid #E2E8F0; }
  .right { text-align: right; }
  .footer { margin-top: 24px; font-size: 11px; color: #64748B; text-align: center; }
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
    <div><strong>Target Selesai:</strong> ${escapeHtml(
      formatDateIndo(order.deadline_date)
    )}</div>
    <div><strong>Harga Total:</strong> ${escapeHtml(formatRupiah(order.total_price))}</div>
    <div><strong>Sudah Dibayar:</strong> ${escapeHtml(formatRupiah(order.paid_amount))}</div>
    <div><strong>Sisa Tagihan:</strong> <span style="color:${
      remaining > 0 ? '#B91C1C' : '#15803D'
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
