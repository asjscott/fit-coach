import { EXERCISES, pickerRows } from "@fit/engines";
import type { Exercise } from "@fit/shared";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList } from "react-native";
import { Badge, BadgeIcon, BadgeText } from "@/components/badge";
import { Card } from "@/components/card";
import { Input, InputField, InputIcon, InputSlot } from "@/components/input";
import { Pressable } from "@/components/pressable";
import { Screen } from "@/components/screen";
import { HStack } from "@/components/stack";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { neededEquipment } from "@/features/exercises/needed-equipment";
import { useCurrentUser } from "@/features/user/current-user-provider";
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
  const tags = user?.equipmentProfiles.find((p) => p.isPrimary)?.tags ?? [];
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
    <Screen padded={false} edges={["bottom"]}>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.exercise.slug}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing[6], gap: spacing[2] }}
        ListHeaderComponent={
          <Input style={{ marginBottom: spacing[2] }}>
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
          <Pressable
            accessibilityRole="button"
            accessibilityHint={flagged ? "Flagged for your injuries" : undefined}
            onPress={() => handlePick(exercise)}
          >
            <Card size="sm">
              <HStack justify="between" align="center" spacing={2}>
                <Text weight="semiBold" style={{ flexShrink: 1 }}>
                  {exercise.name}
                </Text>
                {flagged && (
                  <Badge action="warning">
                    <BadgeIcon name="triangleAlert" />
                    <BadgeText>Injury</BadgeText>
                  </Badge>
                )}
              </HStack>
              {!available && (
                <Text size="sm" color="textMuted">
                  Needs: {neededEquipment(exercise, tags)}
                </Text>
              )}
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text color="textMuted" centered style={{ marginTop: spacing[6] }}>
            No exercises match “{query.trim()}”.
          </Text>
        }
      />
    </Screen>
  );
}
