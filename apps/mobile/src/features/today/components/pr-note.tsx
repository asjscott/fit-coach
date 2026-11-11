import type { UnseenPrs } from "@fit/engines";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Alert, AlertIcon } from "@/components/alert";
import { Icon } from "@/components/icons";
import { Text } from "@/components/text";
import { prLabel, prsHeadline, relativeDateLabel } from "@/features/workouts/format";
import { exerciseName } from "@/features/workouts/library";
import { spacing } from "@/theme";

// PRs from Workouts that uploaded late (#130): one line each, with a link to its Workout in History
export function PrNote({ shown, now, onDismiss }: { shown: UnseenPrs[]; now: Date; onDismiss: () => void }) {
  return (
    <Alert action="success" style={styles.alert}>
      <AlertIcon />
      <View style={styles.body}>
        {shown.map(({ workoutId, startedAt, prs }) => (
          <View key={workoutId} style={styles.workout}>
            <Text size="sm" weight="semiBold">
              {prsHeadline(prs)} · {relativeDateLabel(startedAt, now)}
            </Text>
            {prs.map((pr) => (
              <Text key={pr.slug} size="sm">
                {exerciseName(pr.slug)}: {prLabel(pr)}
              </Text>
            ))}
            <Pressable
              accessibilityRole="link"
              hitSlop={8}
              onPress={() => router.push({ pathname: "/history/[id]", params: { id: workoutId } })}
            >
              <Text size="sm" weight="semiBold" color="accent">
                See workout ›
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
      <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={12}>
        <Icon name="x" size={18} />
      </Pressable>
    </Alert>
  );
}

const styles = StyleSheet.create({
  alert: { alignItems: "flex-start" },
  body: { flex: 1, gap: spacing[3] },
  workout: { gap: spacing[1] },
});
