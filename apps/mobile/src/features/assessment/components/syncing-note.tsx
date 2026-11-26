import { Text } from "@/components/text";

// While a finished Assessment Workout is Pending: the server works out the Assessment once it has it
export function SyncingNote() {
  return (
    <Text size="sm" color="muted">
      Results once synced. Your Assessment is saved on your phone and uploads when you have signal.
    </Text>
  );
}
