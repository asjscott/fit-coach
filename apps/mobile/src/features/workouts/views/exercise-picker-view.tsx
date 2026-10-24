import { EXERCISES } from "@fit/engines";
import type { Exercise } from "@fit/shared";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList } from "react-native";
import { Card } from "@/components/card";
import { Input, InputField, InputIcon, InputSlot } from "@/components/input";
import { Pressable } from "@/components/pressable";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { spacing } from "@/theme";
import { useLogbook } from "../logbook-provider";

// Case-insensitive, so "barbell" and "Barbell" sort together
const byName = [...EXERCISES].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

// Reads the library built into the app, not the API, so it works with no signal
export default function ExercisePickerView() {
  const { addWorkoutExercise } = useLogbook();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const search = query.trim().toLowerCase();
  const matches = search ? byName.filter((e) => e.name.toLowerCase().includes(search)) : byName;

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
        data={matches}
        keyExtractor={(exercise) => exercise.slug}
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
        renderItem={({ item: exercise }) => (
          <Pressable accessibilityRole="button" onPress={() => handlePick(exercise)}>
            <Card size="sm">
              <Text weight="semiBold">{exercise.name}</Text>
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
