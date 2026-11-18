// PROTOTYPE (M7), throwaway: the floating bar that flips the food variants (◀ ▶, or ← →) and the tab bar options
// (◀ ▶, or ↑ ↓). Both land in the URL as ?variant= and ?nav=. Never in production builds
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Platform, Pressable, View } from "react-native";
import { Text } from "@/components/text";
import { NAVS, setProto, useProto, VARIANTS } from "./prototype-data";

type Option = { key: string; name: string };

function useCycler(options: Option[], current: string, field: "variant" | "nav") {
  const index = Math.max(
    0,
    options.findIndex((o) => o.key === current),
  );
  const go = (step: number) => {
    const next = options[(index + step + options.length) % options.length]!.key;
    setProto({ [field]: next });
    router.setParams({ [field]: next });
  };
  return { option: options[index]!, go };
}

function Cycler({ label, option, go }: { label: string; option: Option; go: (step: number) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Pressable
        onPress={() => go(-1)}
        style={{ paddingHorizontal: 8, paddingVertical: 2 }}
        accessibilityLabel={`Previous ${label}`}
      >
        <Text weight="bold" style={{ color: "#fff" }}>
          ◀
        </Text>
      </Pressable>
      <Text size="xs" weight="semiBold" style={{ color: "#fff", width: 220, textAlign: "center" }} numberOfLines={1}>
        {`${label} ${option.key} · ${option.name}`}
      </Text>
      <Pressable
        onPress={() => go(1)}
        style={{ paddingHorizontal: 8, paddingVertical: 2 }}
        accessibilityLabel={`Next ${label}`}
      >
        <Text weight="bold" style={{ color: "#fff" }}>
          ▶
        </Text>
      </Pressable>
    </View>
  );
}

export function PrototypeSwitcher() {
  const { variant, nav } = useProto();
  const params = useLocalSearchParams<{ variant?: string; nav?: string }>();

  // The URL wins on load, so a link to ?variant=B&nav=2 opens those
  useEffect(() => {
    if (params.variant && VARIANTS.some((v) => v.key === params.variant)) setProto({ variant: params.variant });
    if (params.nav && NAVS.some((n) => n.key === params.nav)) setProto({ nav: params.nav });
  }, [params.variant, params.nav]);

  const food = useCycler(VARIANTS, variant, "variant");
  const tabs = useCycler(NAVS, nav, "nav");

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === "ArrowLeft") food.go(-1);
      if (e.key === "ArrowRight") food.go(1);
      if (e.key === "ArrowUp") tabs.go(-1);
      if (e.key === "ArrowDown") tabs.go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!__DEV__) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", left: 0, right: 0, bottom: 8, alignItems: "center", zIndex: 1000 }}
    >
      <View
        style={{
          backgroundColor: "#7C3AED",
          borderRadius: 16,
          paddingHorizontal: 4,
          paddingVertical: 4,
          gap: 2,
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Cycler label="Food" {...food} />
        <Cycler label="Tabs" {...tabs} />
      </View>
    </View>
  );
}
