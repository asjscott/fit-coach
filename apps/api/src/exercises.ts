import { Exercise } from "@fit/shared";
import { db } from "./db";

export const exercises = db.collection<Exercise>("exercises");

// Case-insensitive, so "barbell" and "Barbell" sort together
const byName = { locale: "en", strength: 2 };

export function findExercises() {
  return exercises
    .find({}, { projection: { _id: 0 } })
    .sort({ name: 1 })
    .collation(byName)
    .toArray();
}

export function findExercise(slug: string) {
  return exercises.findOne({ slug }, { projection: { _id: 0 } });
}
