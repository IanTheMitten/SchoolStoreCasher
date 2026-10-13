import { toast } from 'sonner';
import { localDb, onDbChange, parseBackup } from './localDb';
import type { BackupSnapshot } from './localDb';

// Keeps data/db.json (served by vite-plugin-file-db.ts) in sync with IndexedDB.
//
// Startup: whichever side (db.json or the browser) has more data wins and overwrites the
// other — history is never deleted, so the bigger side is the more up-to-date one. If db.json
// doesn't exist yet it is seeded from the browser. After that, every write to IndexedDB is
// followed by a full snapshot written to db.json.

const ENDPOINT = '/__filedb';

let enabled = false;
let initPromise: Promise<void> | null = null;
let dirty = false;
let flushing: Promise<void> | null = null;
let lastErrorToast = 0;

const reportSaveError = (error: unknown) => {
  console.error('Failed to save db.json', error);
  // One toast per 30s is enough; the next successful write clears the problem anyway.
  if (Date.now() - lastErrorToast > 30_000) {
    lastErrorToast = Date.now();
    toast.error('Could not save to data/db.json — is the dev server running?');
  }
};

const writeSnapshot = async () => {
  const snapshot = await localDb.exportAll();
  const res = await fetch(ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  });
  if (!res.ok) throw new Error(`db.json save failed: ${res.status} ${await res.text()}`);
};

// Coalesces bursts of writes: at most one save in flight, plus one more if anything changed meanwhile.
const flush = async () => {
  while (dirty) {
    dirty = false;
    try {
      await writeSnapshot();
    } catch (error) {
      reportSaveError(error);
    }
  }
  flushing = null;
};

const scheduleSave = () => {
  if (!enabled) return;
  dirty = true;
  if (!flushing) flushing = flush();
};

// Sales, stock movements and wallet entries are append-only, so they decide; total record count breaks ties.
const dataSize = (snapshot: BackupSnapshot) => {
  const d = snapshot.data;
  const history = d.transactions.length + d.inventoryAdjustments.length + d.walletEntries.length;
  const total = Object.values(d).reduce((sum, rows) => sum + rows.length, 0);
  return { history, total };
};

// True if `a` holds more data than `b`.
const hasMore = (a: BackupSnapshot, b: BackupSnapshot) => {
  const sa = dataSize(a);
  const sb = dataSize(b);
  return sa.history !== sb.history ? sa.history > sb.history : sa.total > sb.total;
};

const doInit = async () => {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, { cache: 'no-store' });
  } catch (error) {
    console.warn('File DB unavailable, using browser storage only', error);
    return;
  }
  if (res.headers.get('X-File-Db') !== '1') {
    // Not served by our Vite plugin (e.g. a static host) — nothing to sync with.
    console.warn('File DB endpoint not found, using browser storage only');
    return;
  }

  if (res.status === 204) {
    // First run: seed db.json from the browser.
    enabled = true;
    await writeSnapshot();
    toast.success('Created data/db.json from browser data');
  } else if (res.ok) {
    let snapshot;
    try {
      snapshot = parseBackup(await res.json());
    } catch (error: any) {
      // Never overwrite a file we couldn't read — leave it for manual recovery.
      toast.error(`data/db.json is unreadable, file sync is OFF: ${error?.message || error}`);
      return;
    }
    const browser = await localDb.exportAll();
    enabled = true;
    if (hasMore(browser, snapshot)) {
      // Browser is ahead (e.g. the server wasn't running for a while): push it to the file.
      await writeSnapshot();
      toast.success('Browser had newer data, updated data/db.json');
    } else {
      // File is ahead or equal (ties go to the file — the browser store is the fragile one).
      await localDb.importAll(snapshot, { mode: 'replace' });
    }
  } else {
    toast.error(`Could not read data/db.json (${res.status}), file sync is OFF`);
    return;
  }

  onDbChange(scheduleSave);
  // db.json wins on next startup, so closing the tab mid-save would drop the latest change.
  window.addEventListener('beforeunload', (event) => {
    if (flushing) event.preventDefault();
  });
};

export const fileSync = {
  // Safe to call repeatedly; runs once. Must finish before the app reads from IndexedDB.
  init: () => (initPromise ||= doInit().catch(error => {
    console.error('File sync init failed', error);
    toast.error('File sync failed to start, using browser storage only');
  })),
  isEnabled: () => enabled,
  // Resolves once every pending change has been written to db.json.
  waitForSave: async () => {
    await Promise.resolve(); // let change listeners from a just-finished write run first
    while (flushing) await flushing;
  },
};
