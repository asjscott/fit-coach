import { EXERCISES, pickerRows } from "@fit/engines";
import type { Exercise } from "@fit/shared";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList } from "react-native";
import { Badge, BadgeIcon, BadgeText } from "@/components/badge";
import { Input, InputField, InputIcon, InputSlot } from "@/components/input";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { ExerciseRow } from "@/features/exercises/components/exercise-row";
import { neededEquipment } from "@/features/exercises/needed-equipment";
import { useCurrentUser, usePrimaryEquipmentProfile } from "@/features/user/current-user-provider";
import { spacing } from "@/theme";
import { useLogbook } from "../logbook-provider";

// Reads the library built into the app, not the API, so it works with no signal.
// Every Exercise stays selectable: the user might be training somewhere else
export default function ExercisePickerView() {
  const { addWorkoutExercise } = useLogbook();
  const { showToast } = useToast();
  const { user } = useCurrentUser();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  // No primary profile counts as no equipment
  const tags = usePrimaryEquipmentProfile()?.tags ?? [];
  const rows = pickerRows(EXERCISES, { tags, injuries: user?.profile.injuries ?? [], search: query });

  const handlePick = async (exercise: Exercise) => {
    if (adding) return;
    setAdding(true);
    try {
      await addWorkoutExercise(exercise);
      router.back();
    } catch (err) {
      showToast("Couldn't add the Exercise", { error: err });
      setAdding(false);
    }
  };

  return (
    <Screen padded={false} scroll="content" edges={["bottom"]}>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.exercise.slug}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: spacing[6], paddingVertical: spacing[4] }}
        ListHeaderComponent={
          <Input style={{ marginBottom: spacing[4] }}>
            <InputSlot>
              <InputIcon name="search" />
            </InputSlot>
            <InputField
              value={query}
              onChangeText={setQuery}
              placeholder="Search exercises"
              autoCorrect={false}
              accessibilityLabel="Search exercises"
            />
          </Input>
        }
        renderItem={({ item: { exercise, available, flagged } }) => (
          <ExerciseRow
            accessibilityRole="button"
            accessibilityHint={flagged ? "Flagged for your injuries" : undefined}
            name={exercise.name}
            unavailable={!available}
            detail={available ? undefined : `Needs: ${neededEquipment(exercise, tags)}`}
            marker={
              flagged ? (
                <Badge action="warning">
                  <BadgeIcon name="triangleAlert" />
                  <BadgeText>Injury</BadgeText>
                </Badge>
              ) : null
            }
            onPress={() => handlePick(exercise)}
          />
        )}
        ListEmptyComponent={
          <Text color="muted" centered style={{ marginTop: spacing[6] }}>
            No Exercises match “{query.trim()}”.
          </Text>
        }
      />
    </Screen>
  );
}
