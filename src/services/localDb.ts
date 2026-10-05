import type { Product, Student } from '../App';

const DB_NAME = 'schoolstore-db';
const DB_VERSION = 3;
const STORE_PRODUCTS = 'products';
const STORE_STUDENTS = 'students';
const STORE_TEACHERS = 'teachers';
const STORE_TRANSACTIONS = 'transactions';
const STORE_EXPENSES = 'expenses';
const STORE_CATEGORIES = 'categories';
const STORE_INVENTORY_ADJUSTMENTS = 'inventoryAdjustments';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_STUDENTS)) db.createObjectStore(STORE_STUDENTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_TEACHERS)) db.createObjectStore(STORE_TEACHERS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_CATEGORIES)) db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_TRANSACTIONS)) db.createObjectStore(STORE_TRANSACTIONS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_EXPENSES)) db.createObjectStore(STORE_EXPENSES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_INVENTORY_ADJUSTMENTS)) db.createObjectStore(STORE_INVENTORY_ADJUSTMENTS, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
  });
}


function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const createInventoryAdjustment = ({
  productId,
  quantity,
  reason,
  reference,
  unitCost,
  user,
  date,
}: {
  productId: string;
  quantity: number;
  reason: string;
  reference?: string;
  unitCost?: number;
  user?: string;
  date?: string;
}) => ({
  id: `ADJ-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  productId,
  date: date || new Date().toISOString(),
  quantity,
  reason,
  reference: reference || '',
  unitCost,
  user: user || 'system',
});

const normalizeInventoryAdjustment = (adjustment: any) => ({
  id: adjustment.id,
  productId: adjustment.productId,
  date: adjustment.date,
  quantity: Number(adjustment.quantity || 0),
  reason: adjustment.reason || 'correction',
  reference: adjustment.reference || '',
  unitCost: adjustment.unitCost ?? adjustment.unit_cost,
  user: adjustment.user || 'system',
});

const normalizeTransactionCustomer = (transaction: any) => {
  const customerId = transaction.customerId ?? transaction.studentId ?? null;
  const customerType = transaction.customerType ?? null;
  return {
    ...transaction,
    customerId,
    customerType,
    customerName: transaction.customerName ?? transaction.studentName ?? null,
  };
};

const normalizeBarcode = (barcode?: string) => barcode?.trim().toLowerCase() || '';

const assertUniqueNormalizedBarcode = <
  T extends { id?: string; barcode?: string }
>(
  items: T[],
  barcode: string | undefined,
  conflictMessage: string,
  currentId?: string,
) => {
  const normalizedBarcode = normalizeBarcode(barcode);
  if (!normalizedBarcode) {
    return;
  }

  const hasConflict = items.some(item => {
    if (currentId && item.id === currentId) {
      return false;
    }
    return normalizeBarcode(item.barcode) === normalizedBarcode;
  });

  if (hasConflict) {
    throw new Error(conflictMessage);
  }
};

const PERSON_BARCODE_CONFLICT = 'Barcode already exists on another student or teacher';

// Students and teachers share one barcode namespace (the cashier scanner matches both).
const getAllPeopleForBarcodes = async (tx: IDBTransaction) => {
  const students = await reqToPromise(tx.objectStore(STORE_STUDENTS).getAll()) as any[];
  const teachers = await reqToPromise(tx.objectStore(STORE_TEACHERS).getAll()) as any[];
  return [...students, ...teachers] as Array<{ id?: string; barcode?: string }>;
};

const BACKUP_APP_NAME = 'SchoolStoreCasher';
const ALL_STORES = [
  STORE_PRODUCTS,
  STORE_STUDENTS,
  STORE_TEACHERS,
  STORE_TRANSACTIONS,
  STORE_EXPENSES,
  STORE_CATEGORIES,
  STORE_INVENTORY_ADJUSTMENTS,
] as const;

export type BackupStoreName = typeof ALL_STORES[number];

export interface BackupSnapshot {
  app: string;
  schemaVersion: number;
  exportedAt: string;
  data: Record<BackupStoreName, any[]>;
}

// Dates are structured-cloned by IndexedDB (they stay Date objects), but JSON would
// turn them into plain strings. Tag them so a restore gives back real Date objects.
const DATE_TAG = '__date__';

const encodeDates = (value: any): any => {
  if (value instanceof Date) return { [DATE_TAG]: value.toISOString() };
  if (Array.isArray(value)) return value.map(encodeDates);
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const key of Object.keys(value)) out[key] = encodeDates(value[key]);
    return out;
  }
  return value;
};

const decodeDates = (value: any): any => {
  if (Array.isArray(value)) return value.map(decodeDates);
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === DATE_TAG && typeof value[DATE_TAG] === 'string') {
      return new Date(value[DATE_TAG]);
    }
    const out: Record<string, any> = {};
    for (const key of keys) out[key] = decodeDates(value[key]);
    return out;
  }
  return value;
};

const validateSnapshot = (snapshot: any): BackupSnapshot => {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error('Invalid backup file: not a backup object.');
  }
  if (snapshot.app !== BACKUP_APP_NAME) {
    throw new Error('Invalid backup file: this is not a SchoolStoreCasher backup.');
  }
  if (typeof snapshot.schemaVersion !== 'number') {
    throw new Error('Invalid backup file: missing schema version.');
  }
  if (snapshot.schemaVersion > DB_VERSION) {
    throw new Error(`This backup was made by a newer version of the app (schema ${snapshot.schemaVersion}). Please update the app first.`);
  }
  if (snapshot.schemaVersion < 1) {
    throw new Error('Invalid backup file: unsupported schema version.');
  }
  if (!snapshot.data || typeof snapshot.data !== 'object') {
    throw new Error('Invalid backup file: missing data.');
  }
  for (const name of ALL_STORES) {
    const rows = snapshot.data[name];
    if (!Array.isArray(rows)) {
      throw new Error(`Invalid backup file: "${name}" is missing or not a list.`);
    }
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row) || (typeof row.id !== 'string' && typeof row.id !== 'number')) {
        throw new Error(`Invalid backup file: a record in "${name}" has no valid id.`);
      }
    }
  }
  return snapshot as BackupSnapshot;
};

export const countSnapshot = (snapshot: BackupSnapshot): Record<BackupStoreName, number> => {
  const counts = {} as Record<BackupStoreName, number>;
  for (const name of ALL_STORES) counts[name] = snapshot.data[name].length;
  return counts;
};

export const parseBackup = (raw: unknown): BackupSnapshot => validateSnapshot(raw);

export const localDb = {

  exportAll: async (): Promise<BackupSnapshot> => {
    const db = await openDB();
    const tx = db.transaction([...ALL_STORES], 'readonly');
    const data = {} as Record<BackupStoreName, any[]>;
    const results = await Promise.all(ALL_STORES.map(name => reqToPromise(tx.objectStore(name).getAll())));
    ALL_STORES.forEach((name, i) => { data[name] = encodeDates(results[i]); });
    db.close();
    return { app: BACKUP_APP_NAME, schemaVersion: DB_VERSION, exportedAt: new Date().toISOString(), data };
  },

  importAll: async (snapshot: unknown, options: { mode: 'replace' } = { mode: 'replace' }): Promise<Record<BackupStoreName, number>> => {
    if (options.mode !== 'replace') throw new Error('Unsupported import mode.');
    const valid = validateSnapshot(snapshot); // throws before anything is touched
    const rowsByStore = {} as Record<BackupStoreName, any[]>;
    for (const name of ALL_STORES) rowsByStore[name] = decodeDates(valid.data[name]);

    const db = await openDB();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([...ALL_STORES], 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error || new Error('Restore failed and was rolled back.'));
        tx.onerror = () => reject(tx.error || new Error('Restore failed and was rolled back.'));
        try {
          for (const name of ALL_STORES) {
            const store = tx.objectStore(name);
            store.clear();
            for (const row of rowsByStore[name]) store.put(row);
          }
        } catch (err) {
          try { tx.abort(); } catch {}
          reject(err);
        }
      });
    } finally {
      db.close();
    }
    return countSnapshot(valid);
  },

  clearAll: async () => {
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => setTimeout(() => resolve(), 500);
    });
  },


  getAllProducts: async (): Promise<Product[]> => {
    const db = await openDB();
    const tx = db.transaction(STORE_PRODUCTS, 'readonly');
    return reqToPromise(tx.objectStore(STORE_PRODUCTS).getAll()) as Promise<Product[]>;
  },
  getProductById: async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_PRODUCTS, 'readonly');
    return reqToPromise(tx.objectStore(STORE_PRODUCTS).get(id)) as Promise<any>;
  },
  createProduct: async (product: any) => {
    const db = await openDB();
    const tx = db.transaction(STORE_PRODUCTS, 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);
    const allProducts = await reqToPromise(store.getAll()) as any[];
    assertUniqueNormalizedBarcode(allProducts, product.barcode, 'Product barcode already exists');
    const id = product.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const toPut = {
      ...product,
      id,
      barcode: product.barcode?.trim().toLowerCase() || undefined,
    };
    store.put(toPut);
    return new Promise(resolve => { tx.oncomplete = () => resolve(toPut); });
  },
  updateProduct: async (id: string, product: any) => {
    const db = await openDB();
    const tx = db.transaction(STORE_PRODUCTS, 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);
    const allProducts = await reqToPromise(store.getAll()) as any[];
    const nextBarcode = product.barcode !== undefined ? product.barcode : allProducts.find(item => item.id === id)?.barcode;
    assertUniqueNormalizedBarcode(allProducts, nextBarcode, 'Product barcode already exists', id);
    const existing = await reqToPromise(store.get(id)) as any;
    const updated = {
      ...existing,
      ...product,
      id,
      barcode: product.barcode !== undefined ? product.barcode.trim().toLowerCase() || undefined : existing?.barcode,
    };
    store.put(updated);
    return new Promise(resolve => { tx.oncomplete = () => resolve(updated); });
  },
  deleteProduct: async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_PRODUCTS, 'readwrite');
    tx.objectStore(STORE_PRODUCTS).delete(id);
    return new Promise(resolve => { tx.oncomplete = () => resolve({ success: true }); });
  },
  adjustStock: async (id: string, adjustment: { change: number; reason?: string; unit_cost?: number; reference?: string; user?: string }) => {
    const db = await openDB();
    const tx = db.transaction([STORE_PRODUCTS, STORE_INVENTORY_ADJUSTMENTS], 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);
    const adjustmentStore = tx.objectStore(STORE_INVENTORY_ADJUSTMENTS);

    const existing = await reqToPromise(store.get(id)) as any;
    if (!existing) throw new Error('Product not found');

    const newStock = (existing.stock || 0) + (adjustment.change || 0);
    if (newStock < 0) throw new Error('Stock cannot be negative');

    existing.stock = newStock;
    if (adjustment.unit_cost !== undefined) existing.unit_cost = adjustment.unit_cost;
    store.put(existing);

    adjustmentStore.put(createInventoryAdjustment({
      productId: id,
      quantity: adjustment.change || 0,
      reason: adjustment.reason || 'correction',
      reference: adjustment.reference,
      unitCost: adjustment.unit_cost,
      user: adjustment.user,
    }));

    return new Promise(resolve => { tx.oncomplete = () => resolve({ stock: existing.stock, unit_cost: existing.unit_cost }); });
  },

  getAllStudents: async (): Promise<Student[]> => {
    const db = await openDB();
    const tx = db.transaction(STORE_STUDENTS, 'readonly');
    return reqToPromise(tx.objectStore(STORE_STUDENTS).getAll()) as Promise<Student[]>;
  },
  getStudentById: async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_STUDENTS, 'readonly');
    return reqToPromise(tx.objectStore(STORE_STUDENTS).get(id)) as Promise<any>;
  },
  createStudent: async (student: { id?: string; name: string; grade?: string; gender?: string; barcode?: string }) => {
    const db = await openDB();
    const tx = db.transaction([STORE_STUDENTS, STORE_TEACHERS], 'readwrite');
    const store = tx.objectStore(STORE_STUDENTS);
    const allPeople = await getAllPeopleForBarcodes(tx);
    assertUniqueNormalizedBarcode(allPeople, student.barcode, PERSON_BARCODE_CONFLICT, student.id);
    const id = student.id || `stu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const toPut = {
      ...student,
      id,
      barcode: student.barcode?.trim().toLowerCase() || undefined,
    };
    store.put(toPut);
    return new Promise(resolve => { tx.oncomplete = () => resolve(toPut); });
  },
  updateStudent: async (id: string, student: { name?: string; grade?: string; gender?: string; barcode?: string }) => {
    const db = await openDB();
    const tx = db.transaction([STORE_STUDENTS, STORE_TEACHERS], 'readwrite');
    const store = tx.objectStore(STORE_STUDENTS);
    const allPeople = await getAllPeopleForBarcodes(tx);
    const nextBarcode = student.barcode !== undefined ? student.barcode : allPeople.find(item => item.id === id)?.barcode;
    assertUniqueNormalizedBarcode(allPeople, nextBarcode, PERSON_BARCODE_CONFLICT, id);
    const existing = await reqToPromise(store.get(id)) as any;
    const updated = {
      ...existing,
      ...student,
      id,
      barcode: student.barcode !== undefined ? student.barcode.trim().toLowerCase() || undefined : existing?.barcode,
    };
    store.put(updated);
    return new Promise(resolve => { tx.oncomplete = () => resolve(updated); });
  },
  deleteStudent: async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_STUDENTS, 'readwrite');
    tx.objectStore(STORE_STUDENTS).delete(id);
    return new Promise(resolve => { tx.oncomplete = () => resolve({ success: true }); });
  },
  getPurchasesByStudent: async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_TRANSACTIONS, 'readonly');
    const all = await reqToPromise(tx.objectStore(STORE_TRANSACTIONS).getAll()) as any[];
    return all
      .map(normalizeTransactionCustomer)
      .filter(t => t.customerType === 'student' && (t.customerId === id || t.customerId === String(id)));
  },

  getAllTeachers: async () => {
    const db = await openDB();
    const tx = db.transaction(STORE_TEACHERS, 'readonly');
    return reqToPromise(tx.objectStore(STORE_TEACHERS).getAll()) as Promise<any[]>;
  },
  getTeacherById: async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_TEACHERS, 'readonly');
    return reqToPromise(tx.objectStore(STORE_TEACHERS).get(id)) as Promise<any>;
  },
  createTeacher: async (teacher: any) => {
    const db = await openDB();
    const tx = db.transaction([STORE_STUDENTS, STORE_TEACHERS], 'readwrite');
    const store = tx.objectStore(STORE_TEACHERS);
    const id = teacher.id || `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const allPeople = await getAllPeopleForBarcodes(tx);
    assertUniqueNormalizedBarcode(allPeople, teacher.barcode, PERSON_BARCODE_CONFLICT, id);
    const toPut = { ...teacher, id, barcode: normalizeBarcode(teacher.barcode) || undefined };
    store.put(toPut);
    return new Promise(resolve => { tx.oncomplete = () => resolve(toPut); });
  },
  updateTeacher: async (id: string, teacher: any) => {
    const db = await openDB();
    const tx = db.transaction([STORE_STUDENTS, STORE_TEACHERS], 'readwrite');
    const store = tx.objectStore(STORE_TEACHERS);
    const allPeople = await getAllPeopleForBarcodes(tx);
    const existing = await reqToPromise(store.get(id)) as any;
    if (teacher.barcode !== undefined) {
      assertUniqueNormalizedBarcode(allPeople, teacher.barcode, PERSON_BARCODE_CONFLICT, id);
    }
    const updated = {
      ...existing,
      ...teacher,
      id,
      barcode: teacher.barcode !== undefined ? normalizeBarcode(teacher.barcode) || undefined : existing?.barcode,
    };
    store.put(updated);
    return new Promise(resolve => { tx.oncomplete = () => resolve(updated); });
  },
  deleteTeacher: async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_TEACHERS, 'readwrite');
    tx.objectStore(STORE_TEACHERS).delete(id);
    return new Promise(resolve => { tx.oncomplete = () => resolve({ success: true }); });
  },

  getAllCategories: async () => {
    const db = await openDB();
    const tx = db.transaction(STORE_CATEGORIES, 'readonly');
    return reqToPromise(tx.objectStore(STORE_CATEGORIES).getAll()) as Promise<any[]>;
  },
  getCategoryById: async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_CATEGORIES, 'readonly');
    return reqToPromise(tx.objectStore(STORE_CATEGORIES).get(id)) as Promise<any>;
  },
  createCategory: async (cat: any) => {
    const db = await openDB();
    const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
    const store = tx.objectStore(STORE_CATEGORIES);
    const id = cat.id || `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const toPut = { ...cat, id };
    store.put(toPut);
    return new Promise(resolve => { tx.oncomplete = () => resolve(toPut); });
  },
  updateCategory: async (id: string, cat: any) => {
    const db = await openDB();
    const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
    const store = tx.objectStore(STORE_CATEGORIES);
    const existing = await reqToPromise(store.get(id)) as any;
    const updated = { ...existing, ...cat, id };
    store.put(updated);
    return new Promise(resolve => { tx.oncomplete = () => resolve(updated); });
  },
  deleteCategory: async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
    tx.objectStore(STORE_CATEGORIES).delete(id);
    return new Promise(resolve => { tx.oncomplete = () => resolve({ success: true }); });
  },

  createTransaction: async (sale: any) => {
    const db = await openDB();
    const saleItems = sale.items || [];
    const total = (sale.items || []).reduce((sum: number, it: any) => sum + (it.unitPrice || 0) * (it.quantity || 0), 0);

    const ttx = db.transaction([STORE_TRANSACTIONS, STORE_PRODUCTS, STORE_STUDENTS, STORE_INVENTORY_ADJUSTMENTS], 'readwrite');
    const transStore = ttx.objectStore(STORE_TRANSACTIONS);
    const prodStore = ttx.objectStore(STORE_PRODUCTS);
    const adjustmentStore = ttx.objectStore(STORE_INVENTORY_ADJUSTMENTS);

    const productsById = new Map<string, any>();

    for (const item of saleItems) {
      let product = productsById.get(item.productId);
      if (!product) {
        product = await reqToPromise(prodStore.get(item.productId)) as any;
        if (!product) throw new Error('Product not found');
        productsById.set(item.productId, product);
      }

      const quantity = item.quantity || 0;
      const newStock = (product.stock || 0) - quantity;
      if (newStock < 0) throw new Error('Stock cannot be negative');

      product.stock = newStock;
      prodStore.put(product);

      adjustmentStore.put(createInventoryAdjustment({
        productId: item.productId,
        quantity: -quantity,
        reason: 'sale',
        reference: '',
        user: 'system',
        date: sale.timestamp || new Date().toISOString(),
      }));
    }

    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const transaction = {
      id,
      timestamp: sale.timestamp || new Date().toISOString(),
      items: sale.items || [],
      total,
      paymentMethod: sale.paymentMethod,
      customerType: sale.customerType ?? null,
      customerId: sale.customerId ?? sale.studentId ?? null,
      customerName: sale.customerName ?? sale.studentName ?? null,
    };

    transStore.put(transaction);
    return new Promise(resolve => { ttx.oncomplete = () => resolve({ ok: true, transaction }); });
  },
  getAllTransactions: async (filters?: any) => {
    const db = await openDB();
    const tx = db.transaction(STORE_TRANSACTIONS, 'readonly');
    const all = (await reqToPromise(tx.objectStore(STORE_TRANSACTIONS).getAll()) as any[]).map(normalizeTransactionCustomer);
    if (!filters) return all;

    let res = all;
    if (filters.customerType) res = res.filter(r => r.customerType === filters.customerType);
    if (filters.customerId) res = res.filter(r => r.customerId === filters.customerId);
    if (filters.studentId) res = res.filter(r => r.customerType === 'student' && r.customerId === filters.studentId);
    if (filters.start) res = res.filter(r => new Date(r.timestamp) >= new Date(filters.start));
    if (filters.end) res = res.filter(r => new Date(r.timestamp) <= new Date(filters.end));
    return res;
  },

  getProductAdjustments: async (id: string, filters?: { start?: string; end?: string }) => {
    return localDb.getInventoryAdjustments({ productIds: [id], ...filters });
  },
  getInventoryAdjustments: async (filters?: { productIds?: string[]; start?: string; end?: string }) => {
    const db = await openDB();
    const tx = db.transaction(STORE_INVENTORY_ADJUSTMENTS, 'readonly');
    const store = tx.objectStore(STORE_INVENTORY_ADJUSTMENTS);
    const all = (await reqToPromise(store.getAll()) as any[]).map(normalizeInventoryAdjustment);

    const productIds = new Set((filters?.productIds || []).map(String));
    const hasProductFilter = productIds.size > 0;
    const start = filters?.start ? new Date(filters.start) : null;
    const end = filters?.end ? new Date(filters.end) : null;

    return all
      .filter((row) => !hasProductFilter || productIds.has(String(row.productId)))
      .filter((row) => {
        const date = new Date(row.date);
        if (start && date < start) return false;
        if (end && date > end) return false;
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  getAllExpenses: async (filters?: any) => {
    const db = await openDB();
    const tx = db.transaction(STORE_EXPENSES, 'readonly');
    const all = await reqToPromise(tx.objectStore(STORE_EXPENSES).getAll()) as any[];
    if (!filters) return all;

    let res = all;
    if (filters.start) res = res.filter(r => new Date(r.datetime) >= new Date(filters.start));
    if (filters.end) res = res.filter(r => new Date(r.datetime) <= new Date(filters.end));
    return res;
  },
  createExpense: async (expense: any) => {
    const db = await openDB();
    const tx = db.transaction(STORE_EXPENSES, 'readwrite');
    const store = tx.objectStore(STORE_EXPENSES);
    const id = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const e = { ...expense, id };
    store.put(e);
    return new Promise(resolve => { tx.oncomplete = () => resolve(e); });
  },
  deleteExpense: async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_EXPENSES, 'readwrite');
    tx.objectStore(STORE_EXPENSES).delete(id);
    return new Promise(resolve => { tx.oncomplete = () => resolve({ success: true }); });
  }
};
