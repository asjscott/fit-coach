import { Spinner } from "../spinner";
import { Stack } from "../stack";
import { Text } from "../text";

export type LoadingProps = {
  message?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

// Centred spinner with an optional message; fills its parent
export function Loading({ message, size = "lg" }: LoadingProps) {
  return (
    <Stack flex centered spacing={4}>
      <Spinner size={size} />
      {!!message && (
        <Text size="xs" weight="semiBold" color="textMuted" centered>
          {message}
        </Text>
      )}
    </Stack>
  );
}
