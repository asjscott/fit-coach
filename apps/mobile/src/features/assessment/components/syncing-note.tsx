import { Text } from "@/components/text";

// While B is Pending: the server works out the Assessment once it has both Assessment Workouts
export function SyncingNote() {
  return (
    <Text size="sm" color="muted">
      Results once synced. Assessment B is saved on your phone and uploads when you have signal.
    </Text>
  );
}
