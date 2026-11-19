import { MongoServerError } from "mongodb";

// MongoDB's error code for a write a unique index refused
const DUPLICATE_KEY = 11000;

export const isDuplicateKey = (err: unknown) => err instanceof MongoServerError && err.code === DUPLICATE_KEY;

// Runs a write that another request may already have made: the unique index refusing it means it's there
export async function ignoringDuplicateKey(write: () => Promise<unknown>): Promise<void> {
  try {
    await write();
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
  }
}

// Runs an upsert keyed on a unique index. When two first writes race, the loser's insert hits the index, and it's
// retried, now as a plain update
export async function upsertRacing<T>(upsert: () => Promise<T>): Promise<T> {
  try {
    return await upsert();
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    return upsert();
  }
}
