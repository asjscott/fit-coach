import DateTimePicker from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { FormControl, FormControlError, FormControlErrorText } from "@/components/form-control";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { radii, spacing, useTheme } from "@/theme";
import { dateLabel, timeLabel } from "../format";

export type DateTimeFieldProps = {
  label: string;
  value: Date;
  onChange: (value: Date) => void;
  error?: string;
};

// A date and a time picked with the phone's own pickers: compact inline pickers on iOS, dialogs opened from
// two buttons on Android. date-time-field.web.tsx has the browser's inputs instead
export function DateTimeField({ label, value, onChange, error }: DateTimeFieldProps) {
  const { scheme, colors } = useTheme();
  return (
    <FormControl isInvalid={error !== undefined}>
      <View style={styles.row}>
        <Text weight="medium">{label}</Text>
        {Platform.OS === "android" ? (
          <AndroidPickers label={label} value={value} onChange={onChange} />
        ) : (
          <View style={styles.pickers}>
            {(["date", "time"] as const).map((mode) => (
              <DateTimePicker
                key={mode}
                mode={mode}
                display="compact"
                value={value}
                onValueChange={(_, date) => onChange(date)}
                accentColor={colors.accent}
                themeVariant={scheme}
                testID={`${label} ${mode}`}
              />
            ))}
          </View>
        )}
      </View>
      {error !== undefined && (
        <FormControlError>
          <FormControlErrorText>{error}</FormControlErrorText>
        </FormControlError>
      )}
    </FormControl>
  );
}

// Android's pickers are dialogs: a button shows the value and opens one; the dialog unmounts once it closes
function AndroidPickers({ label, value, onChange }: Omit<DateTimeFieldProps, "error">) {
  const { colors } = useTheme();
  const [open, setOpen] = useState<"date" | "time" | null>(null);
  const iso = value.toISOString();

  const handlePicked = (date: Date) => {
    if (open === "time") {
      // Only the time of day comes from the time dialog
      const moved = new Date(value);
      moved.setHours(date.getHours(), date.getMinutes(), 0, 0);
      onChange(moved);
    } else {
      onChange(date);
    }
    setOpen(null);
  };

  return (
    <View style={styles.pickers}>
      {(["date", "time"] as const).map((mode) => (
        <Pressable
          key={mode}
          accessibilityRole="button"
          accessibilityLabel={`${label} ${mode}`}
          onPress={() => setOpen(mode)}
          style={[styles.chip, { backgroundColor: colors.raised }]}
        >
          <Text>{mode === "date" ? dateLabel(iso) : timeLabel(iso)}</Text>
        </Pressable>
      ))}
      {open !== null && (
        <DateTimePicker
          mode={open}
          presentation="dialog"
          value={value}
          accentColor={colors.accent}
          onValueChange={(_, date) => handlePicked(date)}
          onDismiss={() => setOpen(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing[2] },
  pickers: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing[3],
    borderRadius: radii.sm,
  },
});
