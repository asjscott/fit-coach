// PROTOTYPE (M7), throwaway: the floating bar that flips the Today and Food tab variants. Never in production builds
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Platform, Pressable, View } from "react-native";
import { Text } from "@/components/text";
import { setProto, useProto, VARIANTS } from "./prototype-data";

export function PrototypeSwitcher() {
  const { variant } = useProto();
  const params = useLocalSearchParams<{ variant?: string }>();

  // The URL wins on load, so a link to ?variant=B opens B
  useEffect(() => {
    if (params.variant && VARIANTS.some((v) => v.key === params.variant)) setProto({ variant: params.variant });
  }, [params.variant]);

  const index = Math.max(
    0,
    VARIANTS.findIndex((v) => v.key === variant),
  );
  const go = (step: number) => {
    const next = VARIANTS[(index + step + VARIANTS.length) % VARIANTS.length]!.key;
    setProto({ variant: next });
    router.setParams({ variant: next });
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!__DEV__) return null;
  const current = VARIANTS[index]!;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", left: 0, right: 0, bottom: 12, alignItems: "center", zIndex: 1000 }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#7C3AED",
          borderRadius: 999,
          paddingHorizontal: 6,
          paddingVertical: 4,
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Pressable onPress={() => go(-1)} style={{ padding: 8 }} accessibilityLabel="Previous variant">
          <Text weight="bold" style={{ color: "#fff" }}>
            ◀
          </Text>
        </Pressable>
        <Text size="sm" weight="semiBold" style={{ color: "#fff", paddingHorizontal: 6 }}>
          {`${current.key} (${current.name})`}
        </Text>
        <Pressable onPress={() => go(1)} style={{ padding: 8 }} accessibilityLabel="Next variant">
          <Text weight="bold" style={{ color: "#fff" }}>
            ▶
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
