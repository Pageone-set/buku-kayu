import * as SQLite from 'expo-sqlite';
import { getLocalTimestampIso } from '../utils/formatters';

export const DB_NAME = 'bukukayu.db';
const SCHEMA_VERSION = 1;

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

        PRAGMA user_version = ${SCHEMA_VERSION};
      `);
    });
  }

  await seedInitialData(db);
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
