import type { CSSProperties } from "react";
import { StyleSheet, View } from "react-native";
import { FormControl, FormControlError, FormControlErrorText } from "@/components/form-control";
import { Text } from "@/components/text";
import { fonts, fontSizes, radii, spacing, useTheme } from "@/theme";
import { localDateText, localTimeText, withLocalDate, withLocalTime } from "../local-date-time";
import type { DateTimeFieldProps } from "./date-time-field";

// The browser's own date and time inputs: @expo/ui's pickers draw nothing on web.
// A cleared or half-typed input leaves the value as it was
export function DateTimeField({ label, value, onChange, error }: DateTimeFieldProps) {
  const { scheme, colors } = useTheme();
  const input: CSSProperties = {
    height: 44,
    boxSizing: "border-box",
    padding: `0 ${spacing[3]}px`,
    borderRadius: radii.sm,
    border: `1px solid ${error === undefined ? colors.inputBorder : colors.danger}`,
    backgroundColor: colors.surface,
    color: colors.text,
    colorScheme: scheme,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    fontVariantNumeric: "tabular-nums",
    accentColor: colors.accent,
    minWidth: 0,
  };

  const update = (moved: Date | null) => {
    if (moved) onChange(moved);
  };

  return (
    <FormControl isInvalid={error !== undefined}>
      <View style={styles.row}>
        <Text weight="medium">{label}</Text>
        <View style={styles.inputs}>
          <input
            type="date"
            aria-label={`${label} date`}
            value={localDateText(value)}
            onChange={(e) => update(withLocalDate(value, e.currentTarget.value))}
            style={{ ...input, flex: 3 }}
          />
          <input
            type="time"
            aria-label={`${label} time`}
            value={localTimeText(value)}
            onChange={(e) => update(withLocalTime(value, e.currentTarget.value))}
            style={{ ...input, flex: 2 }}
          />
        </View>
      </View>
      {error !== undefined && (
        <FormControlError>
          <FormControlErrorText>{error}</FormControlErrorText>
        </FormControlError>
      )}
    </FormControl>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing[2] },
  inputs: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
});
