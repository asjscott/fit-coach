import type { CheckIn } from "@fit/shared";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Chip } from "@/components/chip";
import { LoadingButton } from "@/components/loading-button";
import { Text } from "@/components/text";
import { radii, spacing, useTheme } from "@/theme";

const RATINGS = [1, 2, 3, 4, 5] as const;

const ROWS: { key: keyof CheckIn; label: string; low: string; high: string }[] = [
  { key: "sleep", label: "Sleep", low: "Poor", high: "Great" },
  { key: "energy", label: "Energy", low: "Poor", high: "Great" },
  { key: "soreness", label: "Soreness", low: "None", high: "Very" },
];

// Sleep, energy and soreness, each a row of five chips with words only at the ends
export function CheckInRatings({
  ratings,
  onRate,
}: {
  ratings: Partial<CheckIn>;
  onRate: (key: keyof CheckIn, rating: number) => void;
}) {
  return (
    <View style={styles.rows}>
      {ROWS.map(({ key, label, low, high }) => (
        <View key={key} style={styles.row}>
          <Text size="sm" weight="semiBold">
            {label}
          </Text>
          <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
            {RATINGS.map((rating) => (
              <View key={rating} style={styles.chip}>
                <Chip label={String(rating)} selected={ratings[key] === rating} onPress={() => onRate(key, rating)} />
              </View>
            ))}
          </View>
          <View style={styles.ends}>
            <Text size="xs" color="muted">
              {low}
            </Text>
            <Text size="xs" color="muted">
              {high}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const isComplete = (ratings: Partial<CheckIn>): ratings is CheckIn =>
  ROWS.every(({ key }) => ratings[key] !== undefined);

// Below the day's card while there's a Planned Workout to start. It never blocks anything: Start doesn't wait for it
export function CheckInCard({ onCheckIn }: { onCheckIn: (checkIn: CheckIn) => void }) {
  const { colors } = useTheme();
  const [ratings, setRatings] = useState<Partial<CheckIn>>({});
  return (
    <View style={[styles.card, { backgroundColor: colors.raised }]}>
      <View style={{ gap: spacing[1] }}>
        <Text weight="semiBold">How are you today?</Text>
        <Text size="sm" color="muted">
          A bad night or sore legs makes today&apos;s Workout lighter.
        </Text>
      </View>
      <CheckInRatings ratings={ratings} onRate={(key, rating) => setRatings({ ...ratings, [key]: rating })} />
      <LoadingButton
        label="Check in"
        size="md"
        action="secondary"
        variant="outline"
        fullWidth
        disabled={!isComplete(ratings)}
        onPress={() => {
          if (isComplete(ratings)) onCheckIn(ratings);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing[4], padding: spacing[5], borderRadius: radii.lg },
  rows: { gap: spacing[3] },
  row: { gap: spacing[1] },
  chips: { flexDirection: "row", gap: spacing[2] },
  chip: { flex: 1 },
  ends: { flexDirection: "row", justifyContent: "space-between" },
});
