import {
  CashFlow,
  CashFlowCategory,
  CashFlowSummary,
  FurnitureOrderDetail,
  WoodSaleDetail,
} from '../src/types/domain';
import {
  buildFurnitureOrderReceiptHtml,
  buildFurnitureOrderWhatsAppText,
  buildMonthlyCashFlowCsv,
  buildMonthlyCashFlowReportHtml,
  buildWoodSaleReceiptHtml,
  buildWoodSaleWhatsAppText,
} from '../src/utils/receiptGenerator';

const FORBIDDEN_ACCOUNTING_TERMS = [
  'jurnal',
  'neraca',
  'piutang',
  'buku besar',
  'laba rugi',
  'debit',
  'kredit',
  'hpp',
];

const SAMPLE_SALE_PARTIAL: WoodSaleDetail = {
  id: 1,
  invoice_number: 'KY-20261121-1001',
  customer_name: 'Pak Budi <Proyek>',
  customer_phone: '081234567890',
  total_volume_m3: 0.288,
  total_amount: 3456000,
  paid_amount: 1500000,
  payment_status: 'PARTIAL',
  notes: 'Antar ke lokasi jam 4 sore',
  created_at: '2026-11-21T10:30:00+07:00',
  items: [
    {
      id: 1,
      sale_id: 1,
      stock_id: 1,
      wood_type: 'Jati',
      length_cm: 400,
      width_cm: 12,
      thickness_cm: 6,
      qty: 10,
      volume_m3: 0.288,
      price_per_m3: 12000000,
      subtotal: 3456000,
    },
  ],
  payments: [
    {
      id: 1,
      sale_id: 1,
      amount: 1500000,
      payment_date: '2026-11-21T10:30:00+07:00',
      note: 'DP kasbon awal',
    },
  ],
};

const SAMPLE_ORDER: FurnitureOrderDetail = {
  id: 2,
  order_code: 'FR-20261121-2002',
  customer_name: 'Ibu Sari',
  customer_phone: '081398765432',
  item_name: 'Kusen Pintu Jati 2 Set',
  total_price: 8000000,
  paid_amount: 3000000,
  production_cost: 4200000,
  status: 'FINISHING',
  deadline_date: '2026-12-05',
  created_at: '2026-11-21T09:00:00+07:00',
  payments: [
    {
      id: 1,
      order_id: 2,
      amount: 3000000,
      payment_type: 'DP',
      payment_date: '2026-11-21T09:00:00+07:00',
      note: 'Transfer BCA',
    },
  ],
  costs: [],
};

describe('receiptGenerator', () => {
  test('nota WhatsApp penjualan kayu kasbon mencantumkan kurang bayar tanpa istilah akuntansi', () => {
    const text = buildWoodSaleWhatsAppText(SAMPLE_SALE_PARTIAL, 'UD Kayu Berkah');
    expect(text).toContain('KY-20261121-1001');
    expect(text).toContain('Rp 3.456.000');
    expect(text).toContain('Rp 1.956.000');
    expect(text).toContain('KASBON / KURANG BAYAR');

    const lower = text.toLowerCase();
    for (const term of FORBIDDEN_ACCOUNTING_TERMS) {
      expect(lower).not.toContain(term);
    }
  });

  test('nota HTML penjualan kayu melakukan escape karakter HTML', () => {
    const html = buildWoodSaleReceiptHtml(SAMPLE_SALE_PARTIAL, 'UD Kayu Berkah');
    expect(html).toContain('Pak Budi &lt;Proyek&gt;');
    expect(html).toContain('0,288 m³');
    expect(html).toContain('Kurang Bayar');
  });

  test('nota orderan furniture WhatsApp & HTML menampilkan perkiraan selesai, sisa tagihan, dan status pengerjaan', () => {
    const waText = buildFurnitureOrderWhatsAppText(SAMPLE_ORDER, 'UD Kayu Berkah');
    expect(waText).toContain('Kusen Pintu Jati 2 Set');
    expect(waText).toContain('Finishing');
    expect(waText).toContain('Rp 5.000.000');
    expect(waText).toContain('Perkiraan Selesai');
    expect(waText).not.toContain('Target Selesai');

    const html = buildFurnitureOrderReceiptHtml(SAMPLE_ORDER, 'UD Kayu Berkah');
    expect(html).toContain('FR-20261121-2002');
    expect(html).toContain('DP Awal');
    expect(html).toContain('Perkiraan Selesai');
    expect(html).not.toContain('Target Selesai');

    for (const term of FORBIDDEN_ACCOUNTING_TERMS) {
      expect(waText.toLowerCase()).not.toContain(term);
      expect(html.toLowerCase()).not.toContain(term);
    }
  });

  test('laporan catatan keuangan bulanan HTML & CSV mengekspor rincian tanpa istilah akuntansi', () => {
    const rows: CashFlow[] = [
      {
        id: 1,
        type: 'IN',
        category: 'WOOD_SALE',
        amount: 3500000,
        description: 'Penjualan kayu Jati, Pak Budi',
        reference_id: 'KY-20261121-1001',
        created_at: '2026-11-21T10:30:00+07:00',
      },
      {
        id: 2,
        type: 'OUT',
        category: 'LABOR_WAGE',
        amount: 500000,
        description: 'Upah tukang "Pak Slamet"',
        reference_id: '',
        created_at: '2026-11-21T16:00:00+07:00',
      },
    ];
    const summary: CashFlowSummary = {
      totalIn: 3500000,
      businessOut: 500000,
      personalDrawOut: 0,
      totalOut: 500000,
      businessNet: 3000000,
      cashBalance: 3000000,
    };
    const categoryTotals: Record<CashFlowCategory, number> = {
      WOOD_SALE: 3500000,
      FURNITURE_PAYMENT: 0,
      MATERIAL_BUY: 0,
      LABOR_WAGE: 500000,
      OPERATIONAL: 0,
      PERSONAL_DRAW: 0,
    };

    const html = buildMonthlyCashFlowReportHtml({
      workshopName: 'UD Kayu Berkah',
      year: 2026,
      monthIndex: 10,
      rows,
      summary,
      categoryTotals,
    });
    expect(html).toContain('November 2026');
    expect(html).toContain('Rp 3.500.000');
    expect(html).toContain('Laporan Catatan Keuangan Bulanan');

    const csv = buildMonthlyCashFlowCsv({
      workshopName: 'UD Kayu Berkah',
      year: 2026,
      monthIndex: 10,
      rows,
      summary,
      categoryTotals,
    });
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('November 2026');
    expect(csv).toContain('"Penjualan kayu Jati, Pak Budi"');
    expect(csv).toContain('"Upah tukang ""Pak Slamet"""');

    for (const term of FORBIDDEN_ACCOUNTING_TERMS) {
      expect(html.toLowerCase()).not.toContain(term);
      expect(csv.toLowerCase()).not.toContain(term);
    }
  });
});
