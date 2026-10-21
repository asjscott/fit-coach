import { useState } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Screen,
  Stack,
  Text,
  TextField,
} from "@/components/ui";
import { textVariants, useTheme, type TextVariant, type ThemePreference } from "@/theme";

const themeOptions: ThemePreference[] = ["system", "light", "dark"];

// Dev-only reference of every UI component and variant
export default function StyleGuide() {
  const { colors, preference, setPreference } = useTheme();
  const [selectedChips, setSelectedChips] = useState<string[]>(["Knee"]);
  const [selectedCard, setSelectedCard] = useState("Build muscle");
  const [height, setHeight] = useState("");

  const toggleChip = (label: string) =>
    setSelectedChips((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label],
    );

  return (
    <Screen scroll edges={["bottom"]}>
      <Stack gap="2xl">
        <Section title="Theme">
          <Box direction="row" gap="sm">
            {themeOptions.map((option) => (
              <Chip
                key={option}
                label={option[0].toUpperCase() + option.slice(1)}
                selected={preference === option}
                onPress={() => setPreference(option)}
              />
            ))}
          </Box>
        </Section>

        <Section title="Text">
          {(Object.keys(textVariants) as TextVariant[]).map((variant) => (
            <Text key={variant} variant={variant}>
              {variant === "numeric" ? "142.5 kg" : variant}
            </Text>
          ))}
          <Text color="textMuted">textMuted</Text>
          <Text color="textSubtle">textSubtle</Text>
        </Section>

        <Section title="Colours">
          <Box direction="row" wrap gap="sm">
            {Object.entries(colors).map(([name, value]) => (
              <Box key={name} gap="xs" style={{ width: 72 }}>
                <Box
                  style={{
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: value,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                />
                <Text variant="caption" color="textSubtle" numberOfLines={1}>
                  {name}
                </Text>
              </Box>
            ))}
          </Box>
        </Section>

        <Section title="Buttons">
          <Button title="Primary" />
          <Button title="Secondary" variant="secondary" />
          <Button title="Ghost" variant="ghost" />
          <Button title="Danger" variant="danger" />
          <Box direction="row" gap="sm">
            <Button title="Medium" size="md" />
            <Button title="Loading" size="md" loading />
            <Button title="Disabled" size="md" disabled />
          </Box>
        </Section>

        <Section title="Cards">
          <Card>
            <Text variant="heading">Static card</Text>
            <Text color="textMuted">Surface container for grouped content.</Text>
          </Card>
          {["Lose fat", "Build muscle"].map((label) => (
            <Card key={label} selected={selectedCard === label} onPress={() => setSelectedCard(label)}>
              <Text variant="bodyStrong">{label}</Text>
              <Text variant="caption" color="textMuted">
                Tap to select
              </Text>
            </Card>
          ))}
        </Section>

        <Section title="Chips">
          <Box direction="row" wrap gap="sm">
            {["Shoulder", "Lower back", "Knee", "Ankle"].map((label) => (
              <Chip
                key={label}
                label={label}
                selected={selectedChips.includes(label)}
                onPress={() => toggleChip(label)}
              />
            ))}
          </Box>
        </Section>

        <Section title="Text fields">
          <TextField
            label="Height (cm)"
            placeholder="180"
            keyboardType="numeric"
            value={height}
            onChangeText={setHeight}
            helper="Between 120 and 230"
          />
          <TextField label="Weight (kg)" value="tall" error="Must be a number" />
        </Section>
      </Stack>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack>
      <Text variant="heading">{title}</Text>
      <Divider />
      {children}
    </Stack>
  );
}
