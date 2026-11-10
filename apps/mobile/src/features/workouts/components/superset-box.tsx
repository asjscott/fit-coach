import { supersetTurn } from "@fit/engines";
import type { InProgressWorkoutExercise } from "@fit/shared";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Alert, AlertIcon, AlertText } from "@/components/alert";
import { Pressable } from "@/components/pressable";
import { SectionLabel } from "@/components/section-label";
import { HStack } from "@/components/stack";
import { Text } from "@/components/text";
import { fonts, radii, spacing, useTheme } from "@/theme";
import { describeSet, plannedSetsLabel, straightToLabel, supersetNote } from "../format";
import { exerciseName, libraryExercise } from "../library";
import { ExerciseBox, ExerciseLogging } from "./current-exercise-box";
import { RestTimer } from "./rest-timer";
import { WorkoutExerciseMenu } from "./workout-exercise-menu";

export type SupersetBoxProps = {
  // The pair, in the Workout's order
  pair: readonly [InProgressWorkoutExercise, InProgressWorkoutExercise];
  // Its letter among the Workout's supersets: "A" makes A1 and A2
  letter: string;
  // The current Workout Exercise, one of the pair, used once both have all their Sets
  currentId: string;
  // Makes one of the pair the current Workout Exercise
  onChoose: (id: string) => void;
};

// A superset being logged (#96), stacked: one box holds both Exercises, A1 above A2. The one whose turn it is is open
// with its steppers, the other shrinks to its name, its Sets so far and "Up next". Logging a Set opens the other,
// with no rest between them, and the rest after the pair's second Set is the longer of the two. Once the one with fewer
// Sets is done, the other rests its own time, as the note says
export function SupersetBox({ pair, letter, currentId, onChoose }: SupersetBoxProps) {
  const { colors } = useTheme();
  const [first, second] = pair;
  const loggedSets = first.sets.length + second.sets.length;
  // Chosen by hand, until the next Set is logged
  const [picked, setPicked] = useState<{ id: string; loggedSets: number } | null>(null);
  const turn = supersetTurn(pair);
  const openId = picked?.loggedSets === loggedSets ? picked.id : (turn?.id ?? currentId);
  const openMember = pair.find(({ id }) => id === openId);
  const rounds = Math.max(...pair.map(({ planned }) => planned?.sets ?? 0));
  const round = Math.min(Math.min(...pair.map(({ sets }) => sets.length)) + 1, rounds);
  const other = pair.find((workoutExercise) => workoutExercise !== turn);
  // Mid-round: the other Exercise of the pair is straight after the one just logged
  const straightTo = turn && other && turn.sets.length < other.sets.length && turn.id === openId ? turn : undefined;

  return (
    <ExerciseBox>
      <SectionLabel color="accent">{`Superset ${letter} · Round ${round} of ${rounds}`}</SectionLabel>
      <Text size="sm" color="muted" style={styles.note}>
        {supersetNote(pair)}
      </Text>
      {pair.map((workoutExercise, i) => {
        const open = workoutExercise.id === openId;
        const { id, slug, sets, planned } = workoutExercise;
        const unilateral = libraryExercise(slug)?.unilateral;
        const done = !!planned && sets.length >= planned.sets;
        const setsSoFar = sets.map(describeSet).join(", ");
        const summary = done
          ? `Done · ${setsSoFar}`
          : open && planned
            ? `Target: ${plannedSetsLabel(planned, unilateral)}`
            : `${sets.length} of ${planned?.sets ?? 0} sets${sets.length ? ` · ${setsSoFar}` : ""}`;
        const label = `${letter}${i + 1}`;
        return (
          <View key={id} style={[styles.member, i > 0 && [styles.divider, { borderTopColor: colors.line }]]}>
            <HStack spacing={2} align="center">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${exerciseName(slug)}, ${summary}`}
                accessibilityState={{ expanded: open }}
                onPress={() => {
                  setPicked({ id, loggedSets });
                  onChoose(id);
                }}
                style={styles.memberHeader}
              >
                <View style={[styles.tag, { backgroundColor: open ? colors.accent : colors.raised }]}>
                  <Text size="sm" weight="bold" style={{ color: open ? colors.onAccent : colors.muted }}>
                    {label}
                  </Text>
                </View>
                <View style={styles.memberText}>
                  <Text accessibilityRole={open ? "header" : undefined} style={open ? styles.name : styles.rowName}>
                    {exerciseName(slug)}
                  </Text>
                  <Text size="sm" color="muted">
                    {summary}
                  </Text>
                </View>
                {!open && !done && sets.length <= (openMember?.sets.length ?? 0) ? (
                  <Text size="xs" color="subtle">
                    Up next
                  </Text>
                ) : null}
              </Pressable>
              <WorkoutExerciseMenu workoutExercise={workoutExercise} />
            </HStack>
            {open ? <ExerciseLogging key={id} workoutExercise={workoutExercise} hideTarget /> : null}
          </View>
        );
      })}
      {straightTo ? (
        <Alert action="info" style={styles.banner}>
          <AlertIcon />
          <AlertText size="md" weight="semiBold">
            {straightToLabel(exerciseName(straightTo.slug))}
          </AlertText>
        </Alert>
      ) : null}
      <RestTimer />
    </ExerciseBox>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: spacing[1] },
  member: { paddingVertical: spacing[3] },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  memberHeader: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing[3] },
  memberText: { flex: 1 },
  tag: { minWidth: 36, height: 28, borderRadius: radii.sm, alignItems: "center", justifyContent: "center" },
  name: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  rowName: { fontFamily: fonts.semiBold },
  banner: { marginTop: spacing[3] },
});
