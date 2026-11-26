import { REST_ADJUSTMENT_SECONDS, restSecondsLeft } from "@fit/engines";
import { StyleSheet } from "react-native";
import { Icon } from "@/components/icons";
import { LoadingButton } from "@/components/loading-button";
import { Pressable } from "@/components/pressable";
import { HStack } from "@/components/stack";
import { Text } from "@/components/text";
import { useNow } from "@/hooks/use-now";
import { spacing } from "@/theme";
import { elapsedClockLabel } from "../format";
import { useLogbook } from "../logbook-provider";

// The rest screen minimised to a bar (#179), over Finish so it stays in sight whatever the user scrolls to. A tap on the
// countdown opens the rest screen again
export function RestTimer() {
  const { rest } = useLogbook();
  return rest && !rest.expanded ? <Countdown /> : null;
}

function Countdown() {
  const { rest, extendRest, shortenRest, skipRest, expandRest } = useLogbook();
  const now = useNow(250);
  if (!rest) return null;
  const clock = elapsedClockLabel(restSecondsLeft(rest, new Date(now)) * 1000);

  return (
    <HStack spacing={2} align="center" style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Rest, ${clock} left. Open the rest screen`}
        onPress={expandRest}
        style={styles.open}
      >
        <Icon name="chevronUp" color="accent" size={18} />
        <Text size="xl" weight="bold" numberOfLines={1}>
          {clock}
        </Text>
      </Pressable>
      <LoadingButton label={`−${REST_ADJUSTMENT_SECONDS} s`} size="sm" action="secondary" onPress={shortenRest} />
      <LoadingButton label={`+${REST_ADJUSTMENT_SECONDS} s`} size="sm" action="secondary" onPress={extendRest} />
      <LoadingButton label="Skip" size="sm" action="secondary" onPress={skipRest} />
    </HStack>
  );
}

const styles = StyleSheet.create({
  row: { height: 44, marginBottom: spacing[3] },
  open: { flex: 1, height: 44, flexDirection: "row", alignItems: "center", gap: spacing[1] },
});
