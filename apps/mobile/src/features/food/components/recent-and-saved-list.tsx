import type { Food, FoodEntryAdd, Meal } from "@fit/shared";
import { StyleSheet, View } from "react-native";
import { Alert, AlertText } from "@/components/alert";
import { LoadingButton } from "@/components/loading-button";
import { Spinner } from "@/components/spinner";
import { Text } from "@/components/text";
import { spacing } from "@/theme";
import type { RecentChoice } from "../recent-and-saved";
import { FoodChoiceChips } from "./food-choice-chips";
import { FoodResult } from "./food-result";

// Recent foods, Saved Foods and Saved Meals as one-tap choices (spec #158 story 62, prototype variant J), the saved
// ones first and starred. A tap starts adding it: the food opens below to choose a portion and a meal
export function RecentAndSavedList({
  choices,
  error,
  chosen,
  onChoose,
  meal,
  onLog,
  onEdit,
  onNewSavedMeal,
}: {
  choices: RecentChoice[] | undefined;
  error: string | null;
  // The key of the choice open to log, if any
  chosen: string | null;
  onChoose: (key: string | null) => void;
  meal: Meal | null;
  onLog: (add: FoodEntryAdd) => Promise<boolean>;
  onEdit: (food: Food) => void;
  // Opens a new Saved Meal (spec #188 story 31)
  onNewSavedMeal: () => void;
}) {
  const open = choices?.find((c) => c.key === chosen);

  return (
    <View style={styles.section}>
      <Text size="xs" color="muted" weight="semiBold">
        RECENT AND SAVED
      </Text>
      {!choices ? (
        error ? null : (
          <Spinner />
        )
      ) : !choices.length ? (
        <Text size="sm" color="muted">
          The foods you log, and the ones you save from a label, show here to add again with a tap.
        </Text>
      ) : (
        <FoodChoiceChips choices={choices} chosen={chosen} onChoose={onChoose} />
      )}
      {error && !choices ? (
        <Alert action="muted">
          <AlertText>Your recent and saved foods need a connection.</AlertText>
        </Alert>
      ) : null}
      {open ? (
        <FoodResult
          key={open.key}
          food={open.food}
          open
          onToggle={() => onChoose(null)}
          meal={meal}
          onLog={onLog}
          // A food deleted since it was logged is still Recent, with nothing left to edit
          onEdit={open.saved ? onEdit : undefined}
        />
      ) : null}
      <LoadingButton
        label="New saved meal"
        size="sm"
        action="secondary"
        variant="link"
        icon="plus"
        onPress={onNewSavedMeal}
        style={styles.newSavedMeal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing[3] },
  newSavedMeal: { alignSelf: "flex-start" },
});
