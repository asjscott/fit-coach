import { fixedRestChoice, type RestChoice } from "@fit/engines";
import { View } from "react-native";
import { Chip } from "@/components/chip";
import { Slider, SliderFilledTrack, SliderThumb, SliderTrack } from "@/components/slider";
import { HStack } from "@/components/stack";
import { Text } from "@/components/text";
import { restChoiceLabel } from "@/features/workouts/format";

// Where the thumb waits while Auto is chosen, each Exercise then resting its own time
const AUTO_THUMB_SECONDS = 90;

// The Rest Choice in one row (#178, #206): Auto, or a fixed length from the slider, 30 s to 3 min in 15 s steps.
// Moving the slider picks a length and leaves Auto; Auto goes back to it
export function RestChoiceRow({ choice, onChoose }: { choice: RestChoice; onChoose: (choice: RestChoice) => void }) {
  const auto = choice === "auto";
  const chooseAt = (seconds: number) => onChoose(fixedRestChoice(seconds));
  return (
    <HStack spacing={3}>
      <View>
        <Text size="sm">Rest between Sets</Text>
        <Text size="sm" color="muted">
          {restChoiceLabel(choice)}
        </Text>
      </View>
      <Chip label="Auto" selected={auto} onPress={() => onChoose("auto")} />
      <Slider
        value={auto ? AUTO_THUMB_SECONDS : choice}
        minValue={30}
        maxValue={180}
        step={15}
        size="sm"
        // On lifting too, so a tap where the thumb waits still leaves Auto
        onChange={chooseAt}
        onChangeEnd={chooseAt}
        accessibilityLabel="Rest between Sets"
        style={{ flex: 1 }}
      >
        <SliderTrack>{auto ? null : <SliderFilledTrack />}</SliderTrack>
        <SliderThumb />
      </Slider>
    </HStack>
  );
}
