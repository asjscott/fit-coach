import { router, usePathname } from "expo-router";
import Play from "lucide-react-native/icons/play";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { radii, spacing, useTheme } from "@/theme";
import { elapsedLabel } from "../format";
import { useLogbook } from "../logbook-provider";
import { showsResumePill } from "../resume-pill";
import { ForgottenWorkoutModal } from "./forgotten-workout-modal";

// Re-renders as each whole minute since the start passes, so the elapsed time keeps counting
function useElapsed(startedAt: string | undefined) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!startedAt) return;
    const sinceStart = Math.max(0, Date.now() - Date.parse(startedAt));
    const timer = setTimeout(() => setNow(new Date()), 60_000 - (sinceStart % 60_000));
    return () => clearTimeout(timer);
  }, [startedAt, now]);
  return startedAt ? elapsedLabel(startedAt, now) : "";
}

// Takes the user back to the In-progress Workout from any tab, unless it was forgotten. Stacked puts the elapsed
// time under the label, to fit the side rail's narrow foot
export function ResumePill({ stacked = false }: { stacked?: boolean }) {
  const { workout, isStale } = useLogbook();
  const { colors } = useTheme();
  const pathname = usePathname();
  const elapsed = useElapsed(workout?.startedAt);
  const [forgotten, setForgotten] = useState(false);

  const handlePress = async () => {
    if (await isStale()) setForgotten(true);
    else router.push("/workout");
  };

  return (
    <>
      {showsResumePill(workout, pathname) && (
        <View style={{ paddingHorizontal: spacing[3], paddingBottom: spacing[2] }}>
          <Pressable
            role="button"
            accessibilityLabel={`Resume workout, ${elapsed}`}
            onPress={handlePress}
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
