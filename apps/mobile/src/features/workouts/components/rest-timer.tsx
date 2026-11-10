import { restSecondsLeft, REST_EXTENSION_SECONDS } from "@fit/engines";
import { StyleSheet, View } from "react-native";
import { LoadingButton } from "@/components/loading-button";
import { HStack } from "@/components/stack";
import { TABULAR, Text } from "@/components/text";
import { useNow } from "@/hooks/use-now";
import { spacing } from "@/theme";
import { elapsedClockLabel } from "../format";
import { useLogbook } from "../logbook-provider";

// The rest after the last Set, in a slot of its own height whether or not a rest is under way, so nothing on the
// logging screen moves when it appears
export function RestTimer() {
  const { rest } = useLogbook();
  return <View style={styles.slot}>{rest ? <Countdown /> : null}</View>;
}

function Countdown() {
  const { rest, extendRest, skipRest } = useLogbook();
  const now = useNow(250);
  if (!rest) return null;
  const clock = elapsedClockLabel(restSecondsLeft(rest, new Date(now)) * 1000);

  return (
    <HStack spacing={2} align="center" style={styles.row}>
      <Text weight="semiBold" style={styles.clock} accessibilityRole="timer" accessibilityLabel={`Rest, ${clock} left`}>
        {`Rest ${clock}`}
      </Text>
      <LoadingButton label={`+${REST_EXTENSION_SECONDS} s`} size="sm" action="secondary" onPress={extendRest} />
      <LoadingButton label="Skip" size="sm" action="secondary" onPress={skipRest} />
    </HStack>
  );
}

const styles = StyleSheet.create({
  slot: { height: 44, marginTop: spacing[3], justifyContent: "center" },
  row: { height: 44 },
  clock: { flex: 1, fontVariant: TABULAR },
});
