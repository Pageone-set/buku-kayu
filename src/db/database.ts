import * as SQLite from 'expo-sqlite';
import { getLocalTimestampIso } from '../utils/formatters';

export const DB_NAME = 'bukukayu.db';
const SCHEMA_VERSION = 3;

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

async function configureConnection(conn: SQLite.SQLiteDatabase): Promise<void> {
  await conn.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);
}

async function seedInitialData(db: SQLite.SQLiteDatabase): Promise<void> {
  const now = getLocalTimestampIso();

  await db.runAsync(
    'INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)',
    'workshop_name',
    'Bengkel Kayu'
  );
  await db.runAsync(
    'INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)',
    'auto_backup_wifi',
    '1'
  );

  const seededRow = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    'seeded_v1'
  );
  if (seededRow?.value === '1') {
    return;
  }

  const countRow = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM wood_stocks'
  );
  if ((countRow?.cnt ?? 0) > 0) {
    await db.runAsync(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      'seeded_v1',
      '1'
    );
    return;
  }

  const starterStocks = [
    {
      woodType: 'Jati',
      lengthCm: 400,
      widthCm: 12,
      thicknessCm: 6,
      stockQty: 24,
      buyPriceM3: 9500000,
      sellPriceM3: 12000000,
    },
    {
      woodType: 'Jati',
      lengthCm: 400,
      widthCm: 12,
      thicknessCm: 8,
      stockQty: 14,
      buyPriceM3: 10000000,
      sellPriceM3: 12500000,
    },
    {
      woodType: 'Mahoni',
      lengthCm: 400,
      widthCm: 10,
      thicknessCm: 5,
      stockQty: 30,
      buyPriceM3: 4200000,
      sellPriceM3: 5500000,
    },
    {
      woodType: 'Mahoni',
      lengthCm: 400,
      widthCm: 20,
      thicknessCm: 2,
      stockQty: 40,
      buyPriceM3: 4300000,
      sellPriceM3: 5600000,
    },
    {
      woodType: 'Sengon',
      lengthCm: 300,
      widthCm: 20,
      thicknessCm: 2,
      stockQty: 60,
      buyPriceM3: 2100000,
      sellPriceM3: 2800000,
    },
    {
      woodType: 'Kamper',
      lengthCm: 400,
      widthCm: 12,
      thicknessCm: 6,
      stockQty: 18,
      buyPriceM3: 6800000,
      sellPriceM3: 8500000,
    },
  ];

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const item of starterStocks) {
      await txn.runAsync(
        `INSERT INTO wood_stocks
          (wood_type, length_cm, width_cm, thickness_cm, stock_qty, buy_price_m3, sell_price_m3, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        item.woodType,
        item.lengthCm,
        item.widthCm,
        item.thicknessCm,
        item.stockQty,
        item.buyPriceM3,
        item.sellPriceM3,
        now
      );
    }
    await txn.runAsync(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      'seeded_v1',
      '1'
    );
  });
}

async function ensureColumnExists(
  txn: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  definition: string
): Promise<void> {
  const columns = await txn.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table})`
  );
  if (!columns.some((col) => col.name === column)) {
    await txn.execAsync(
      `ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`
    );
  }
}

async function seedMarketPricesAndSuppliersIfNeeded(
  db: SQLite.SQLiteDatabase
): Promise<void> {
  const now = getLocalTimestampIso();

  const starterBuyPrices: Record<string, number> = {
    jati: 9500000,
    mahoni: 4200000,
    sengon: 2100000,
    kamper: 6800000,
  };

  await db.withExclusiveTransactionAsync(async (txn) => {
    const existingTypes = await txn.getAllAsync<{
      id: number;
      name: string;
      default_buy_price_m3: number;
      price_updated_at: string;
    }>(
      'SELECT id, name, default_buy_price_m3, price_updated_at FROM wood_types'
    );

    for (const row of existingTypes) {
      const key = row.name.trim().toLowerCase();
      const starterBuy = starterBuyPrices[key];
      const nextBuy =
        row.default_buy_price_m3 === 0 && starterBuy
          ? starterBuy
          : row.default_buy_price_m3;
      const nextUpdated = row.price_updated_at || now;
      if (
        nextBuy !== row.default_buy_price_m3 ||
        nextUpdated !== row.price_updated_at
      ) {
        await txn.runAsync(
          `UPDATE wood_types
           SET default_buy_price_m3 = ?, price_updated_at = ?
           WHERE id = ?`,
          nextBuy,
          nextUpdated,
          row.id
        );
      }
    }

    const seededRow = await txn.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      'seeded_suppliers_v3'
    );
    if (seededRow?.value === '1') {
      return;
    }

    const supplierCount = await txn.getFirstAsync<{ cnt: number }>(
      'SELECT COUNT(*) AS cnt FROM wood_suppliers'
    );
    if ((supplierCount?.cnt ?? 0) === 0) {
      const sup1 = await txn.runAsync(
        `INSERT INTO wood_suppliers (supplier_name, location, phone, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        'Sawmill Pak Karno',
        'Blora, Jawa Tengah',
        '',
        'Kayu balok kering, bisa kirim truk',
        now,
        now
      );
      await txn.runAsync(
        `INSERT INTO wood_supplier_prices (supplier_id, wood_type, buy_price_m3, unit_note, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        sup1.lastInsertRowId,
        'Jati',
        9500000,
        'Balok 6×12 & 8×12',
        now
      );
      await txn.runAsync(
        `INSERT INTO wood_supplier_prices (supplier_id, wood_type, buy_price_m3, unit_note, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        sup1.lastInsertRowId,
        'Kamper',
        6800000,
        'Balok 6×12',
        now
      );

      const sup2 = await txn.runAsync(
        `INSERT INTO wood_suppliers (supplier_name, location, phone, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        'UD Rimba Mandiri',
        'Temanggung, Jawa Tengah',
        '',
        'Terima borongan papan & sengon',
        now,
        now
      );
      await txn.runAsync(
        `INSERT INTO wood_supplier_prices (supplier_id, wood_type, buy_price_m3, unit_note, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        sup2.lastInsertRowId,
        'Mahoni',
        4200000,
        'Balok 5×10 & Papan 2×20',
        now
      );
      await txn.runAsync(
        `INSERT INTO wood_supplier_prices (supplier_id, wood_type, buy_price_m3, unit_note, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        sup2.lastInsertRowId,
        'Sengon',
        2100000,
        'Papan 2×20',
        now
      );
    }

    await txn.runAsync(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      'seeded_suppliers_v3',
      '1'
    );
  });
}

async function seedWoodPresetsIfNeeded(
  db: SQLite.SQLiteDatabase
): Promise<void> {
  const now = getLocalTimestampIso();
  const seededRow = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    'seeded_presets_v2'
  );
  if (seededRow?.value === '1') {
    return;
  }

  const starterWoodTypes = [
    { name: 'Jati', colorHex: '#8B5A2B', defaultPriceM3: 12000000, sortOrder: 1 },
    { name: 'Mahoni', colorHex: '#7A3528', defaultPriceM3: 5500000, sortOrder: 2 },
    { name: 'Sengon', colorHex: '#D7BC91', defaultPriceM3: 2800000, sortOrder: 3 },
    { name: 'Kamper', colorHex: '#B57C4A', defaultPriceM3: 8500000, sortOrder: 4 },
  ];

  const starterDimensions = [
    { label: '6×12', thicknessCm: 6, widthCm: 12, defaultLengthCm: 400, sortOrder: 1 },
    { label: '8×12', thicknessCm: 8, widthCm: 12, defaultLengthCm: 400, sortOrder: 2 },
    { label: '5×10', thicknessCm: 5, widthCm: 10, defaultLengthCm: 400, sortOrder: 3 },
    { label: '2×20 (Papan)', thicknessCm: 2, widthCm: 20, defaultLengthCm: 400, sortOrder: 4 },
  ];

  await db.withExclusiveTransactionAsync(async (txn) => {
    const typeCnt = await txn.getFirstAsync<{ cnt: number }>(
      'SELECT COUNT(*) AS cnt FROM wood_types'
    );
    if ((typeCnt?.cnt ?? 0) === 0) {
      for (const item of starterWoodTypes) {
        await txn.runAsync(
          `INSERT INTO wood_types (name, color_hex, default_price_m3, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          item.name,
          item.colorHex,
          item.defaultPriceM3,
          item.sortOrder,
          now
        );
      }
    }

    const dimCnt = await txn.getFirstAsync<{ cnt: number }>(
      'SELECT COUNT(*) AS cnt FROM wood_dimensions'
    );
    if ((dimCnt?.cnt ?? 0) === 0) {
      for (const dim of starterDimensions) {
        await txn.runAsync(
          `INSERT INTO wood_dimensions (label, thickness_cm, width_cm, default_length_cm, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          dim.label,
          dim.thicknessCm,
          dim.widthCm,
          dim.defaultLengthCm,
          dim.sortOrder,
          now
        );
      }
    }

    await txn.runAsync(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      'seeded_presets_v2',
      '1'
    );
  });
}

async function migrateIfNeeded(db: SQLite.SQLiteDatabase): Promise<void> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS wood_stocks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          wood_type TEXT NOT NULL,
          length_cm REAL NOT NULL,
          width_cm REAL NOT NULL,
          thickness_cm REAL NOT NULL,
          stock_qty INTEGER NOT NULL DEFAULT 0,
          buy_price_m3 REAL NOT NULL DEFAULT 0,
          sell_price_m3 REAL NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS wood_sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_number TEXT NOT NULL UNIQUE,
          customer_name TEXT NOT NULL,
          customer_phone TEXT NOT NULL DEFAULT '',
          total_volume_m3 REAL NOT NULL,
          total_amount REAL NOT NULL,
          paid_amount REAL NOT NULL,
          payment_status TEXT NOT NULL CHECK (payment_status IN ('PAID', 'PARTIAL')),
          notes TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS wood_sale_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          stock_id INTEGER NULL,
          wood_type TEXT NOT NULL,
          length_cm REAL NOT NULL,
          width_cm REAL NOT NULL,
          thickness_cm REAL NOT NULL,
          qty INTEGER NOT NULL,
          volume_m3 REAL NOT NULL,
          price_per_m3 REAL NOT NULL,
          subtotal REAL NOT NULL,
          FOREIGN KEY (sale_id) REFERENCES wood_sales(id) ON DELETE CASCADE,
          FOREIGN KEY (stock_id) REFERENCES wood_stocks(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS wood_sale_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          payment_date TEXT NOT NULL,
          note TEXT NOT NULL DEFAULT '',
          FOREIGN KEY (sale_id) REFERENCES wood_sales(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS furniture_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_code TEXT NOT NULL UNIQUE,
          customer_name TEXT NOT NULL,
          customer_phone TEXT NOT NULL DEFAULT '',
          item_name TEXT NOT NULL,
          total_price REAL NOT NULL,
          paid_amount REAL NOT NULL DEFAULT 0,
          production_cost REAL NOT NULL DEFAULT 0,
          status TEXT NOT NULL CHECK (status IN ('ORDERED', 'ASSEMBLY', 'FINISHING', 'READY', 'COMPLETED')),
          deadline_date TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS furniture_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          payment_type TEXT NOT NULL CHECK (payment_type IN ('DP', 'INSTALLMENT', 'FINAL')),
          payment_date TEXT NOT NULL,
          note TEXT NOT NULL DEFAULT '',
          FOREIGN KEY (order_id) REFERENCES furniture_orders(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS furniture_costs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          cost_category TEXT NOT NULL CHECK (cost_category IN ('WOOD', 'LABOR', 'ACCESSORIES')),
          description TEXT NOT NULL,
          amount REAL NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (order_id) REFERENCES furniture_orders(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS cash_flows (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL CHECK (type IN ('IN', 'OUT')),
          category TEXT NOT NULL CHECK (category IN ('WOOD_SALE', 'FURNITURE_PAYMENT', 'MATERIAL_BUY', 'LABOR_WAGE', 'OPERATIONAL', 'PERSONAL_DRAW')),
          amount REAL NOT NULL,
          description TEXT NOT NULL,
          reference_id TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_wood_sales_created_at ON wood_sales(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_wood_sales_payment_status ON wood_sales(payment_status);
        CREATE INDEX IF NOT EXISTS idx_wood_sale_items_sale_id ON wood_sale_items(sale_id);
        CREATE INDEX IF NOT EXISTS idx_wood_sale_payments_sale_id ON wood_sale_payments(sale_id);
        CREATE INDEX IF NOT EXISTS idx_furniture_orders_status ON furniture_orders(status);
        CREATE INDEX IF NOT EXISTS idx_furniture_orders_created_at ON furniture_orders(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_furniture_payments_order_id ON furniture_payments(order_id);
        CREATE INDEX IF NOT EXISTS idx_furniture_costs_order_id ON furniture_costs(order_id);
        CREATE INDEX IF NOT EXISTS idx_cash_flows_created_at ON cash_flows(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_cash_flows_type ON cash_flows(type);

        PRAGMA user_version = 1;
      `);
    });
  }

  if (currentVersion < 2) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS wood_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE COLLATE NOCASE,
          color_hex TEXT NOT NULL DEFAULT '#8B5A2B',
          default_price_m3 REAL NOT NULL DEFAULT 0,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS wood_dimensions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          label TEXT NOT NULL,
          thickness_cm REAL NOT NULL,
          width_cm REAL NOT NULL,
          default_length_cm REAL NOT NULL DEFAULT 400,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );

        PRAGMA user_version = 2;
      `);
    });
  }

  if (currentVersion < 3) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await ensureColumnExists(
        txn,
        'wood_types',
        'default_buy_price_m3',
        'REAL NOT NULL DEFAULT 0'
      );
      await ensureColumnExists(
        txn,
        'wood_types',
        'price_updated_at',
        "TEXT NOT NULL DEFAULT ''"
      );
      await ensureColumnExists(
        txn,
        'wood_stocks',
        'last_supplier_name',
        "TEXT NOT NULL DEFAULT ''"
      );

      await txn.execAsync(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS wood_suppliers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          supplier_name TEXT NOT NULL,
          location TEXT NOT NULL DEFAULT '',
          phone TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS wood_supplier_prices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          supplier_id INTEGER NOT NULL,
          wood_type TEXT NOT NULL,
          buy_price_m3 REAL NOT NULL DEFAULT 0,
          unit_note TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL,
          FOREIGN KEY (supplier_id) REFERENCES wood_suppliers(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_wood_supplier_prices_supplier_id ON wood_supplier_prices(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_wood_supplier_prices_wood_type ON wood_supplier_prices(wood_type);

        PRAGMA user_version = ${SCHEMA_VERSION};
      `);
    });
  }

  await seedInitialData(db);
  await seedWoodPresetsIfNeeded(db);
  await seedMarketPricesAndSuppliersIfNeeded(db);
}

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await configureConnection(db);
    await migrateIfNeeded(db);
    dbInstance = db;
    return db;
  })();

  try {
    return await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  return initDatabase();
}

/**
 * Menjalankan transaksi tulis secara berurutan dan eksklusif dengan foreign_keys aktif.
 */
export async function runInTransaction<T>(
  task: (txn: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> {
  const run = writeQueue.then(async () => {
    const db = await getDatabase();
    let result!: T;
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
      result = await task(txn);
    });
    return result;
  });

  writeQueue = run.catch(() => undefined);
  return run;
}

export async function checkpointWal(): Promise<void> {
  await writeQueue.catch(() => undefined);
  const db = await getDatabase();
  await db.execAsync('PRAGMA wal_checkpoint(FULL);');
}

export async function closeDatabase(): Promise<void> {
  await writeQueue.catch(() => undefined);
  if (initPromise) {
    await initPromise.catch(() => undefined);
  }
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
  initPromise = null;
}

export async function reopenDatabase(): Promise<SQLite.SQLiteDatabase> {
  await closeDatabase();
  return initDatabase();
}
