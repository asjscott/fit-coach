import { ideaFood } from "@fit/engines";
import { type Day, dietOf, type FoodEntryAdd, type FoodIdea } from "@fit/shared";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { LoadingButton } from "@/components/loading-button";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { CoachSummaryCard } from "@/features/nutrition/components/coach-summary-card";
import { DietModal } from "@/features/nutrition/components/diet-modal";
import { ideaLine } from "@/features/nutrition/coach-summary";
import { dietLabel } from "@/features/nutrition/diet";
import { useCurrentUser } from "@/features/user/current-user-provider";
import { radii, spacing, useTheme } from "@/theme";
import { mealName } from "../today-so-far";

// The Coach's summary with its Food Ideas and the Diet they follow, at the top of the Ideas half (spec #158 stories
// 56 to 61). Add logs an idea's set portion, as a Food Entry from source idea, into the meal for the time of day
export function FoodIdeas({ day, onLog }: { day: Day; onLog: (add: FoodEntryAdd) => Promise<boolean> }) {
  const { colors } = useTheme();
  const { user } = useCurrentUser();
  const [adding, setAdding] = useState<string | null>(null);
  const [editingDiet, setEditingDiet] = useState(false);

  const add = async (idea: FoodIdea) => {
    setAdding(idea.id);
    try {
      await onLog({ meal: day.ideaMeal, food: ideaFood(idea), portion: { serving: idea.portion.label, count: 1 } });
    } finally {
      setAdding(null);
    }
  };

  return (
    <CoachSummaryCard day={day}>
      {day.ideas.map((idea) => (
        <View key={idea.id} style={[styles.idea, { borderColor: colors.line }]}>
          <View style={styles.words}>
            <Text size="sm" weight="semiBold">
              {idea.name}
            </Text>
            <Text size="xs" color="muted">
              {ideaLine(idea)}
            </Text>
          </View>
          <LoadingButton
            label={mealName(day.ideaMeal)}
            icon="plus"
            size="sm"
            action="secondary"
            loading={adding === idea.id}
            disabled={adding !== null}
            onPress={() => add(idea)}
          />
        </View>
      ))}
      <Pressable
        onPress={() => setEditingDiet(true)}
        accessibilityRole="button"
        accessibilityLabel={`Diet: ${dietLabel(dietOf(user?.profile))}. Change`}
        style={[styles.diet, { borderColor: colors.line }]}
      >
        <Text size="xs" color="muted">
          {`Diet: ${dietLabel(dietOf(user?.profile))} ✎`}
        </Text>
      </Pressable>
      {editingDiet ? <DietModal onClose={() => setEditingDiet(false)} /> : null}
    </CoachSummaryCard>
  );
}

const styles = StyleSheet.create({
  idea: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  words: { flex: 1, gap: 2 },
  diet: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.pill,
    borderWidth: 1,
  },
});
