import { Exercise } from "@fit/shared";
import { db } from "./db";

export const exercises = db.collection<Exercise>("exercises");

// Case-insensitive, so "barbell" and "Barbell" sort together
const byName = { locale: "en", strength: 2 };

// Parsed so a collection seeded before a field with a default still serves; a response schema doesn't apply defaults
export async function findExercises() {
  const stored = await exercises
    .find({}, { projection: { _id: 0 } })
    .sort({ name: 1 })
    .collation(byName)
    .toArray();
  return stored.map((exercise) => Exercise.parse(exercise));
}

export async function findExercise(slug: string) {
  const exercise = await exercises.findOne({ slug }, { projection: { _id: 0 } });
  return exercise && Exercise.parse(exercise);
}
