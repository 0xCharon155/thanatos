import { altarRef, db } from "../config/firebase";

export async function acquireLock(): Promise<boolean> {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(altarRef());
    if (snap.data()?.is_locked) return false;
    tx.update(altarRef(), { is_locked: true, locked_at: Date.now() });
    return true;
  });
}

export const releaseLock = () => altarRef().update({ is_locked: false, locked_at: null });
