import type { Set, Workout } from "@fit/shared";

// How Workouts and Sets read on screen

export const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const minutesLabel = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)} h ${rest} min` : `${minutes / 60} h`;
};

export const durationLabel = ({ startedAt, endedAt }: Pick<Workout, "startedAt" | "endedAt">) =>
  minutesLabel(Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60_000));

// How long a Workout still in progress has run: whole minutes, like a clock, and never below 0 if the phone's
// clock has moved back
export const elapsedLabel = (startedAt: string, now: Date) =>
  minutesLabel(Math.max(0, Math.floor((now.getTime() - Date.parse(startedAt)) / 60_000)));

// A Set as its Load Type records it; add " per side" for a one-sided Exercise
export function describeSet(set: Set) {
  switch (set.kind) {
    case "external":
      return `${set.kg} kg × ${set.reps}`;
    case "bodyweight":
      return `${set.reps} reps`;
    case "timed":
      return `${set.seconds} s`;
  }
}
