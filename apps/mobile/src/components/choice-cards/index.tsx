import { Card } from "../card";
import { Grid, GridItem } from "../grid";
import { Icon, type IconName } from "../icons";
import { Pressable } from "../pressable";
import { HStack, Stack } from "../stack";
import { Text } from "../text";

export type ChoiceCardOption<T extends string = string> = {
  value: T;
  label: string;
  description: string;
  icon: IconName;
};

type ChoiceCardsProps<T extends string> = {
  options: ChoiceCardOption<T>[];
  value?: T;
  onChange: (value: T) => void;
};

// Cards rather than a dropdown, so each choice can explain itself; two columns so four fit on a small phone (#71)
export function ChoiceCards<T extends string>({ options, value, onChange }: ChoiceCardsProps<T>) {
  return (
    <Grid columns={2} gap={2} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <GridItem key={option.value}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(option.value)}
              style={{ flex: 1 }}
            >
              <Card size="sm" selected={selected} style={{ flex: 1 }}>
                <Stack spacing={1}>
                  <HStack spacing={2}>
                    <Icon name={option.icon} size={18} color={selected ? "accent" : "muted"} />
                    <Text weight="semiBold" style={{ flexShrink: 1 }}>
                      {option.label}
                    </Text>
                  </HStack>
                  <Text size="sm" color="muted">
                    {option.description}
                  </Text>
                </Stack>
              </Card>
            </Pressable>
          </GridItem>
        );
      })}
    </Grid>
  );
}
