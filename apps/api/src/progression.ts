import { exerciseBySlug, progressWorkingLevel, seedWorkingLevels, weekOfBlock } from "@fit/engines";
import { WorkingLevel, type Workout } from "@fit/shared";
import { findLatestAssessment, workingLevels } from "./assessments";
import { plannedWorkouts } from "./planned-workouts";
import type { OnboardedUser } from "./users";

// Progression at upload (#132, ADR 0007): moves the Working Level of each Exercise in the Workout from its own Sets,
// before the Planned Workout is rebuilt, so the next plan uses them. For every upload, retries included: a level moves
// only for a Workout that started after the one that last moved it, so a retry, a late Pending Workout or a past
// Workout never moves it twice or backwards. Nothing before the first Assessment, which sets the first levels
export async function progressWorkingLevels(clerkUserId: string, workout: Workout, user: OnboardedUser) {
  const latest = await findLatestAssessment(clerkUserId);
  const equipmentProfile = user.equipmentProfiles.find(({ isPrimary }) => isPrimary);
  if (!latest || !equipmentProfile) return;

  // As the planner works them out: the stored level, unless the primary profile does the Exercise another way, and
  // otherwise one seeded from the Assessment, such as for an Exercise a profile added since makes available
  const { assessment } = latest;
  const seeded = seedWorkingLevels({
    referenceStrengths: Object.fromEntries(
      Object.entries(assessment.patterns).map(([pattern, { referenceStrength }]) => [pattern, referenceStrength]),
    ),
    bodyWeightKg: assessment.bodyWeightKg,
    equipmentProfiles: [equipmentProfile],
  });
  const stored = new Map(latest.workingLevels.map((level) => [level.slug, level]));
  const levelOf = (slug: string) => {
    const seed = seeded.find((level) => level.slug === slug);
    const level = stored.get(slug);
    return level && (!seed || seed.unit === level.unit) ? level : seed;
  };

  const planned = workout.plannedWorkoutId
    ? await plannedWorkouts.findOne({ clerkUserId, id: workout.plannedWorkoutId })
    : null;
  const deloadWeek = weekOfBlock(assessment, new Date(workout.startedAt), user.timeZone)?.deload ?? false;

  for (const workoutExercise of workout.workoutExercises) {
    const exercise = exerciseBySlug(workoutExercise.slug);
    const level = levelOf(workoutExercise.slug);
    if (!exercise || !level) continue;
    const progression = progressWorkingLevel({
      level,
      workout,
      workoutExercise,
      exercise,
      equipmentProfile,
      deloadWeek,
      plannedSets: planned?.plannedExercises.find(({ slug }) => slug === exercise.slug)?.sets,
    });
    if (!progression) continue;
    // Only over the level it moved, so an upload racing another moves it once
    const { slug, movedBy } = level;
    const filter = movedBy
      ? { clerkUserId, slug, "movedBy.workoutId": movedBy.workoutId }
      : { clerkUserId, slug, $or: [{ movedBy: null }, { movedBy: { $exists: false } }] };
    await workingLevels.replaceOne(
      filter,
      { ...WorkingLevel.parse(progression.level), clerkUserId, assessmentId: assessment.id },
      { upsert: !stored.has(slug) },
    );
  }
}
