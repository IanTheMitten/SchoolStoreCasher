import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory mutex for file operations
let dbLock = false;
const lockQueue = [];

const acquireLock = () => {
  return new Promise((resolve) => {
    if (!dbLock) {
      dbLock = true;
      resolve();
    } else {
      lockQueue.push(resolve);
    }
  });
};

const releaseLock = () => {
  dbLock = false;
  if (lockQueue.length > 0) {
    const next = lockQueue.shift();
    next();
  }
};

const getDbPath = () => {
  const dbFile = process.env.DB_FILE || path.join(__dirname, '../db.json');
  return dbFile;
};

const getDefaultDb = () => ({
  products: [],
  students: [],
  transactions: [],
  transactionItems: [],
  inventoryAdjustments: [],
  expenses: []
});

export const loadDB = () => {
  const dbPath = getDbPath();
  
  if (!fs.existsSync(dbPath)) {
    const defaultDb = getDefaultDb();
    saveDB(defaultDb);
    return defaultDb;
  }

  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(data);
    
    // Ensure all required arrays exist
    return {
      products: db.products || [],
      students: db.students || [],
      transactions: db.transactions || [],
      transactionItems: db.transactionItems || [],
      inventoryAdjustments: db.inventoryAdjustments || [],
      expenses: db.expenses || []
    };
  } catch (error) {
    console.error('Error loading DB:', error);
    return getDefaultDb();
  }
};

export const saveDB = (db) => {
  const dbPath = getDbPath();
  
  try {
    // Create backup before writing
    if (fs.existsSync(dbPath)) {
      const backupPath = `${dbPath}.backup`;
      fs.copyFileSync(dbPath, backupPath);
    }
    
    // Write atomically using temporary file
    const tempPath = `${dbPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tempPath, dbPath);
  } catch (error) {
    console.error('Error saving DB:', error);
    throw error;
  }
};

/**
 * Execute a function with database access, ensuring atomicity
 * @param {Function} fn - Function that receives db object and returns a promise
 * @returns {Promise} Result of fn
 */
export const withDB = async (fn) => {
  await acquireLock();
  
  try {
    const db = loadDB();
    const result = await fn(db);
    saveDB(db);
    return result;
  } finally {
    releaseLock();
  }
};

/**
 * Read-only access to DB (no lock needed for reads, but we use lock for consistency)
 */
export const readDB = async (fn) => {
  await acquireLock();
  
  try {
    const db = loadDB();
    return await fn(db);
  } finally {
    releaseLock();
  }
};

