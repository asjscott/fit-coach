import { usePathname } from "expo-router";
import Play from "lucide-react-native/icons/play";
import { View } from "react-native";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { useNow } from "@/hooks/use-now";
import { radii, spacing, useTheme } from "@/theme";
import { elapsedLabel } from "../format";
import { useResumeWorkout } from "../hooks/use-open-workout";
import { useLogbook } from "../logbook-provider";
import { showsResumePill } from "../resume-pill";
import { ForgottenWorkoutModal } from "./forgotten-workout-modal";

// Takes the user back to the In-progress Workout from any tab, unless it was forgotten. Stacked puts the elapsed
// time under the label, to fit the side rail's narrow foot
export function ResumePill({ stacked = false }: { stacked?: boolean }) {
  const { workout } = useLogbook();
  const { colors } = useTheme();
  const pathname = usePathname();
  const now = useNow();
  const elapsed = workout ? elapsedLabel(now - Date.parse(workout.startedAt)) : "";
  const { resumeWorkout, forgotten, setForgotten } = useResumeWorkout();

  return (
    <>
      {showsResumePill(workout, pathname) && (
        <View style={{ paddingHorizontal: spacing[3], paddingBottom: spacing[2] }}>
          <Pressable
            role="button"
            accessibilityLabel={`Resume workout, ${elapsed}`}
            onPress={resumeWorkout}
            style={{
              height: 52,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[3],
              paddingLeft: 10,
              paddingRight: 18,
              borderRadius: radii.pill,
              backgroundColor: colors.accent,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: radii.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.onAccent,
              }}
            >
              <Play size={16} color={colors.accent} fill={colors.accent} />
            </View>
            <View style={stacked ? { flex: 1 } : { flex: 1, flexDirection: "row", alignItems: "center" }}>
              <Text bold color="onAccent" size={stacked ? "sm" : "md"} style={!stacked && { flex: 1 }} isTruncated>
                Resume workout
              </Text>
              <Text weight="semiBold" color="onAccent" size={stacked ? "xs" : "md"}>
                {elapsed}
              </Text>
            </View>
          </Pressable>
        </View>
      )}
      <ForgottenWorkoutModal isOpen={forgotten} onDone={() => setForgotten(false)} />
    </>
  );
}
