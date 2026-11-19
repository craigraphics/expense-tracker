import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const firestoreSetDoc = vi.fn().mockResolvedValue(undefined);
const firestoreDeleteDoc = vi.fn().mockResolvedValue(undefined);
vi.mock('firebase/firestore', () => ({ setDoc: firestoreSetDoc, deleteDoc: firestoreDeleteDoc }));

const ref = { path: 'users/u1/periods/2026-12-1' } as never;

const load = async (readOnly: boolean) => {
  vi.resetModules();
  vi.stubEnv('VITE_READ_ONLY', readOnly ? 'true' : 'false');
  return import('./firestoreWrites');
};

describe('firestoreWrites', () => {
  beforeEach(() => {
    firestoreSetDoc.mockClear();
    firestoreDeleteDoc.mockClear();
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });
  afterEach(() => vi.unstubAllEnvs());

  it('blocks every write in read-only mode without touching Firestore', async () => {
    const w = await load(true);
    expect(w.READ_ONLY).toBe(true);
    await expect(w.setDoc(ref, { bankBalance: 1 })).rejects.toSatisfy(w.isReadOnlyError);
    await expect(w.setDoc(ref, { bankBalance: 1 }, { merge: true })).rejects.toSatisfy(w.isReadOnlyError);
    await expect(w.deleteDoc(ref)).rejects.toSatisfy(w.isReadOnlyError);
    expect(firestoreSetDoc).not.toHaveBeenCalled();
    expect(firestoreDeleteDoc).not.toHaveBeenCalled();
  });

  it('passes writes through normally', async () => {
    const w = await load(false);
    expect(w.READ_ONLY).toBe(false);
    await w.setDoc(ref, { bankBalance: 1 }, { merge: true });
    await w.deleteDoc(ref);
    expect(firestoreSetDoc).toHaveBeenCalledWith(ref, { bankBalance: 1 }, { merge: true });
    expect(firestoreDeleteDoc).toHaveBeenCalledWith(ref);
  });
});
