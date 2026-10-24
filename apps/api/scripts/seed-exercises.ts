import { Exercise } from "@fit/shared";
import { EXERCISES } from "@fit/engines";
import { client, db } from "../src/db";

const exercises = db.collection<Exercise>("exercises");
await exercises.createIndex({ slug: 1 }, { unique: true });

for (const raw of EXERCISES) {
  const exercise = Exercise.parse(raw); // refuse to seed anything invalid
  await exercises.replaceOne({ slug: exercise.slug }, exercise, { upsert: true });
}

console.log(`Seeded ${EXERCISES.length} exercises`);
await client.close();
