import { MongoClient } from "mongodb";

export const client = new MongoClient(process.env.MONGODB_URI!);
export const db = client.db();

export async function pingDb(): Promise<"up" | "down"> {
  try {
    await db.command({ ping: 1 });
    return "up";
  } catch {
    return "down";
  }
}