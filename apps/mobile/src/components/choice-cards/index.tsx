import { createContext, use } from "react";
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

// True where large cards would run off the screen, so ChoiceCards below it go small (#71)
export const CompactChoiceCards = createContext(false);

type CardProps = { option: ChoiceCardOption; selected: boolean; onPress: () => void };

function LargeCard({ option, selected, onPress }: CardProps) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress}>
      <Card size="lg" selected={selected}>
        <HStack spacing={4}>
          <Icon name={option.icon} color={selected ? "accent" : "muted"} />
          <Stack flex spacing={1}>
            <Text size="lg" weight="semiBold">
              {option.label}
            </Text>
            <Text size="sm" color="muted">
              {option.description}
            </Text>
          </Stack>
        </HStack>
      </Card>
    </Pressable>
  );
}

function CompactCard({ option, selected, onPress }: CardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
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
  );
}

type ChoiceCardsProps<T extends string> = {
  options: ChoiceCardOption<T>[];
  value?: T;
  onChange: (value: T) => void;
};

// Cards rather than a dropdown, so each choice can explain itself
export function ChoiceCards<T extends string>({ options, value, onChange }: ChoiceCardsProps<T>) {
  const compact = use(CompactChoiceCards);

  if (compact) {
    return (
      <Grid columns={2} gap={2} accessibilityRole="radiogroup">
        {options.map((option) => (
          <GridItem key={option.value}>
            <CompactCard option={option} selected={value === option.value} onPress={() => onChange(option.value)} />
          </GridItem>
        ))}
      </Grid>
    );
  }
  return (
    <Stack spacing={3} accessibilityRole="radiogroup">
      {options.map((option) => (
        <LargeCard
          key={option.value}
          option={option}
          selected={value === option.value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </Stack>
  );
}
