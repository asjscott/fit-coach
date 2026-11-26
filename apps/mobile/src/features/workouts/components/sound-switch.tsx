import { HStack } from "@/components/stack";
import { Switch } from "@/components/switch";
import { Text } from "@/components/text";
import { useLogbook } from "../logbook-provider";
import { hasRestSound, unlockRestSound } from "../rest-sound";

// Whether rests and holds beep, where they can
export function SoundSwitch() {
  const { restSoundOn, setRestSoundOn } = useLogbook();
  if (!hasRestSound()) return null;
  return (
    <HStack spacing={2} align="center">
      <Text color="muted">Sound</Text>
      <Switch
        accessibilityLabel="Sound"
        value={restSoundOn}
        onValueChange={(on) => {
          unlockRestSound();
          setRestSoundOn(on);
        }}
      />
    </HStack>
  );
}
