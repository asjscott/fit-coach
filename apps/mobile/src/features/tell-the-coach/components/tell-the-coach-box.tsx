import { loggableDates } from "@fit/engines";
import type { FoodProposal } from "@fit/shared";
import { useRef, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Input, InputClear, InputField } from "@/components/input";
import { LoadingButton } from "@/components/loading-button";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { useFoodEntries } from "@/features/food/hooks/use-food-entries";
import { useTimeZone } from "@/features/user/current-user-provider";
import { spacing } from "@/theme";
import { useTellTheCoach } from "../hooks/use-tell-the-coach";
import { ConfirmProposalsSheet } from "./confirm-proposals-sheet";

// "Tell the coach" on Today (spec #158 stories 79 to 83): what the user ate, in words, becomes proposed Food Entries
// behind a confirm sheet. Hidden when the API has no parser (no Gemini key) or can't be reached. `onLogged` reloads the
// day once foods are logged
export function TellTheCoachBox({ onLogged, style }: { onLogged: () => void; style?: StyleProp<ViewStyle> }) {
  const { available, parse } = useTellTheCoach();
  const timeZone = useTimeZone();
  const { showToast } = useToast();
  const { add } = useFoodEntries(onLogged);
  const [text, setText] = useState("");
  const [asking, setAsking] = useState(false);
  const [sheet, setSheet] = useState<{ isOpen: boolean; proposals: FoodProposal[]; answer: number; today: string }>({
    isOpen: false,
    proposals: [],
    answer: 0,
    today: "",
  });
  // How many foods this answer has logged so far: a ref, as the sheet closes straight after the last one logs
  const logged = useRef(0);

  if (!available) return null;

  const ask = async () => {
    const words = text.trim();
    if (!words) return;
    setAsking(true);
    const today = loggableDates(new Date(), timeZone)[0];
    const proposals = await parse(words, today);
    setAsking(false);
    if (proposals) {
      logged.current = 0;
      setSheet((s) => ({ isOpen: true, proposals, answer: s.answer + 1, today }));
    }
  };

  const close = () => {
    setSheet((s) => ({ ...s, isOpen: false }));
    const count = logged.current;
    if (count) {
      // The words are done with once something from them is logged
      setText("");
      showToast(count === 1 ? "Logged 1 food" : `Logged ${count} foods`, { type: "success" });
      logged.current = 0;
    }
  };

  return (
    <View style={[styles.box, style]}>
      <Text size="sm" weight="semiBold" color="muted">
        Tell the coach
      </Text>
      <View style={styles.row}>
        <Input size="md" style={{ flex: 1 }}>
          <InputField
            value={text}
            onChangeText={setText}
            placeholder="Yesterday I had two eggs and toast"
            accessibilityLabel="Tell the coach what you ate"
            returnKeyType="send"
            onSubmitEditing={ask}
            maxLength={500}
          />
          {text ? <InputClear onPress={() => setText("")} accessibilityLabel="Clear what you told the coach" /> : null}
        </Input>
        <LoadingButton label="Tell" size="md" loading={asking} disabled={!text.trim()} onPress={ask} />
      </View>
      <ConfirmProposalsSheet
        isOpen={sheet.isOpen}
        proposals={sheet.proposals}
        answer={sheet.answer}
        today={sheet.today}
        onClose={close}
        onLog={async (date, entry) => {
          const ok = await add(date, entry);
          if (ok) logged.current += 1;
          return ok;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing[2] },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
});
