import { collection, getDocsFromServer } from 'firebase/firestore';
import { db } from '../firebase';

export interface Backup {
  app: 'expense-tracker';
  version: 1;
  exportedAt: string;
  uid: string;
  /** Every period document exactly as stored, keyed by period ID (`YYYY-M-H`) */
  periods: Record<string, unknown>;
  /** Settings documents (e.g. prediction prefs); empty if the rules don't allow reading them yet */
  settings: Record<string, unknown>;
  notes: string[];
}

const readCollection = async (uid: string, name: string) => {
  const snap = await getDocsFromServer(collection(db, 'users', uid, name));
  return Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
};

/** Reads everything the user owns straight from the server. Read-only. */
export const buildBackup = async (uid: string): Promise<Backup> => {
  const notes: string[] = [];
  const periods = await readCollection(uid, 'periods');
  let settings: Record<string, unknown> = {};
  try {
    settings = await readCollection(uid, 'settings');
  } catch {
    notes.push('Settings could not be read (Firestore rules for settings may not be deployed yet).');
  }
  return {
    app: 'expense-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    uid,
    periods,
    settings,
    notes,
  };
};

export const downloadBackup = async (uid: string): Promise<number> => {
  const backup = await buildBackup(uid);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `expense-tracker-backup-${backup.exportedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  return Object.keys(backup.periods).length;
};
