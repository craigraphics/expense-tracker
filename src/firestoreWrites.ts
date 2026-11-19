import {
  setDoc as firestoreSetDoc,
  deleteDoc as firestoreDeleteDoc,
  type DocumentReference,
  type SetOptions,
  type WithFieldValue,
  type DocumentData,
} from 'firebase/firestore';

/**
 * Read-only mode for local testing against the production database.
 * Enabled only by `pnpm run dev:readonly` (VITE_READ_ONLY=true); never set in deployed builds.
 * Every app write goes through this module, so in read-only mode nothing reaches Firestore.
 */
export const READ_ONLY = import.meta.env.VITE_READ_ONLY === 'true';

export class ReadOnlyError extends Error {
  constructor() {
    super('Read-only mode: changes are not saved');
    this.name = 'ReadOnlyError';
  }
}

export const isReadOnlyError = (error: unknown): error is ReadOnlyError =>
  error instanceof ReadOnlyError;

export function setDoc<T extends DocumentData>(
  ref: DocumentReference<T>,
  data: WithFieldValue<T>,
  options?: SetOptions
): Promise<void> {
  if (READ_ONLY) {
    console.info('[read-only] blocked write to', ref.path, data);
    return Promise.reject(new ReadOnlyError());
  }
  return options ? firestoreSetDoc(ref, data, options) : firestoreSetDoc(ref, data);
}

export function deleteDoc(ref: DocumentReference): Promise<void> {
  if (READ_ONLY) {
    console.info('[read-only] blocked delete of', ref.path);
    return Promise.reject(new ReadOnlyError());
  }
  return firestoreDeleteDoc(ref);
}
