import {
  findLowestPriceByWoodType,
  normalizeWhatsAppPhone,
  validateWoodSupplierInput,
} from '../src/utils/supplierHelpers';
import { WoodSupplierWithPrices } from '../src/types/domain';

describe('supplierHelpers', () => {
  test('validateWoodSupplierInput normalizes valid data and enforces required fields', () => {
    expect(
      validateWoodSupplierInput({
        supplierName: '  Sawmill   Pak Karno ',
        location: ' Blora ',
        phone: '0812-3456-7890',
        notes: ' Kering oven ',
        items: [
          {
            woodType: ' Jati  ',
            buyPriceM3: 9500000,
            unitNote: ' Balok 6×12 ',
          },
        ],
      })
    ).toEqual({
      supplierName: 'Sawmill Pak Karno',
      location: 'Blora',
      phone: '0812-3456-7890',
      notes: 'Kering oven',
      items: [
        {
          woodType: 'Jati',
          buyPriceM3: 9500000,
          unitNote: 'Balok 6×12',
        },
      ],
    });

    expect(() =>
      validateWoodSupplierInput({
        supplierName: '   ',
        items: [{ woodType: 'Jati', buyPriceM3: 9000000 }],
      })
    ).toThrow();

    expect(() =>
      validateWoodSupplierInput({
        supplierName: 'Pak Budi',
        items: [],
      })
    ).toThrow();

    expect(() =>
      validateWoodSupplierInput({
        supplierName: 'Pak Budi',
        items: [{ woodType: 'Jati', buyPriceM3: -1000 }],
      })
    ).toThrow();
  });

  test('findLowestPriceByWoodType identifies cheapest supplier only when >=2 positive offers exist', () => {
    const sample: WoodSupplierWithPrices[] = [
      {
        id: 1,
        supplier_name: 'A',
        location: 'Blora',
        phone: '',
        notes: '',
        created_at: '',
        updated_at: '',
        items: [
          { id: 1, supplier_id: 1, wood_type: 'Jati', buy_price_m3: 9500000, unit_note: '', updated_at: '' },
          { id: 2, supplier_id: 1, wood_type: 'Kamper', buy_price_m3: 6800000, unit_note: '', updated_at: '' },
        ],
      },
      {
        id: 2,
        supplier_name: 'B',
        location: 'Cepu',
        phone: '',
        notes: '',
        created_at: '',
        updated_at: '',
        items: [
          { id: 3, supplier_id: 2, wood_type: 'jati', buy_price_m3: 9100000, unit_note: '', updated_at: '' },
        ],
      },
    ];

    expect(findLowestPriceByWoodType(sample)).toEqual({
      jati: 9100000,
    });
  });

  test('normalizeWhatsAppPhone converts local Indonesian numbers to 62 format', () => {
    expect(normalizeWhatsAppPhone('0812-3456-7890')).toBe('6281234567890');
    expect(normalizeWhatsAppPhone('+62 812 3456 7890')).toBe('6281234567890');
    expect(normalizeWhatsAppPhone('81234567890')).toBe('6281234567890');
    expect(normalizeWhatsAppPhone('')).toBe('');
  });
});
