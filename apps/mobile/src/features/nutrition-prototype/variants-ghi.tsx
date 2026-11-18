// PROTOTYPE (M7), throwaway: G, H and I combine the picks from A–F. Today: B's rings at the very top (where C put
// its line), water tapped in from Today (C), and E's coaching summary. Food: B's header rings and water glasses,
// C's search and Scan at the top and its Today so far card with meals that open, and E's summary. The summary
// suggests foods to fill what's left of kcal and protein, never one the user's diet rules out
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Icon } from "@/components/icons";
import { Text } from "@/components/text";
import { radii, spacing, useTheme } from "@/theme";
import { eatenBase, fmt, type Meal, meals, recent, saved, setProto, targets, useProto } from "./prototype-data";

const openFood = () => router.navigate("/food");
const mealKcal = (m: Meal) => Math.round(m.entries.reduce((t, e) => t + e.kcal, 0));
const litres = (ml: number, digits = 1) => (ml / 1000).toFixed(digits);

function useEaten() {
  const { water } = useProto();
  return { ...eatenBase, water };
}

// ---------------------------------------------------------------------------------------------------------------
// Diets and suggestions

export const DIETS = ["None", "Pescatarian", "Vegetarian", "Vegan"] as const;
export type Diet = (typeof DIETS)[number];
type Kind = "meat" | "fish" | "vegetarian" | "vegan";
const allowed: Record<Diet, Kind[]> = {
  None: ["meat", "fish", "vegetarian", "vegan"],
  Pescatarian: ["fish", "vegetarian", "vegan"],
  Vegetarian: ["vegetarian", "vegan"],
  Vegan: ["vegan"],
};
type Idea = { name: string; portion: string; kcal: number; protein: number; kind: Kind };
const IDEAS: Idea[] = [
  { name: "Chicken thigh, roasted", portion: "150 g", kcal: 315, protein: 38, kind: "meat" },
  { name: "Lean beef mince", portion: "150 g", kcal: 375, protein: 39, kind: "meat" },
  { name: "Salmon fillet", portion: "150 g", kcal: 310, protein: 34, kind: "fish" },
  { name: "Cottage cheese, 2%", portion: "1 cup", kcal: 195, protein: 27, kind: "vegetarian" },
  { name: "Eggs, whole", portion: "3 large", kcal: 234, protein: 19, kind: "vegetarian" },
  { name: "Tofu, firm", portion: "200 g", kcal: 290, protein: 32, kind: "vegan" },
  { name: "Tempeh", portion: "150 g", kcal: 290, protein: 30, kind: "vegan" },
  { name: "Lentil dal", portion: "1½ cups", kcal: 345, protein: 27, kind: "vegan" },
];

// The two most protein-dense foods the diet allows that fit in the kcal left
export function suggest(kcalLeft: number, diet: Diet) {
  return IDEAS.filter((i) => allowed[diet].includes(i.kind) && i.kcal <= kcalLeft)
    .sort((a, b) => b.protein / b.kcal - a.protein / a.kcal)
    .slice(0, 2);
}

// E's voice: what's left, then a way to fill it
function summary(eaten: { kcal: number; protein: number }, ideas: Idea[]) {
  const kcalLeft = targets.kcal - eaten.kcal;
  const proteinLeft = targets.protein - eaten.protein;
  const covered = ideas.reduce((t, i) => t + i.protein, 0);
  const headline = `${fmt(kcalLeft)} kcal and ${proteinLeft} g of protein left.`;
  const line = ideas.length
    ? `${ideas.map((i, n) => (n ? i.name.split(",")[0]!.toLowerCase() : i.name.split(",")[0])).join(" and ")} at dinner would cover ${covered >= proteinLeft ? "all" : `${covered} g`} of the protein.`
    : "Nothing in your suggestions fits what's left.";
  return { headline, line };
}

function useDiet() {
  const { diet } = useProto();
  return diet as Diet;
}
const nextDiet = (d: Diet) => DIETS[(DIETS.indexOf(d) + 1) % DIETS.length]!;

function DietChip() {
  const { colors } = useTheme();
  const diet = useDiet();
  return (
    <Pressable onPress={() => setProto({ diet: nextDiet(diet) })} style={[styles.chip, { borderColor: colors.line }]}>
      <Text size="xs" color="muted">
        {diet === "None" ? "Any diet ✎" : `${diet} ✎`}
      </Text>
    </Pressable>
  );
}

function CoachSummary({ withIdeas, compact = false }: { withIdeas: boolean; compact?: boolean }) {
  const { colors } = useTheme();
  const eaten = useEaten();
  const diet = useDiet();
  const ideas = suggest(targets.kcal - eaten.kcal, diet);
  const { headline, line } = summary(eaten, ideas);
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.line },
        compact && { padding: spacing[3] },
      ]}
    >
      <View style={{ flexDirection: "row", gap: spacing[3], alignItems: "flex-start" }}>
        <View style={[styles.coachIcon, { backgroundColor: colors.accentSoft }]}>
          <Icon name="target" size={16} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text weight="semiBold">{headline}</Text>
          <Text size="sm" color="muted">
            {line}
          </Text>
        </View>
      </View>
      {withIdeas
        ? ideas.map((i) => (
            <View
              key={i.name}
              style={[
                styles.rowBetween,
                { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line, paddingTop: spacing[2] },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text size="sm">{i.name}</Text>
                <Text size="xs" color="muted">{`${i.portion} · ${i.kcal} kcal · ${i.protein} g protein`}</Text>
              </View>
              <Text size="sm" color="accent" weight="semiBold">
                + Dinner
              </Text>
            </View>
          ))
        : null}
      <View style={[styles.rowBetween, { marginTop: withIdeas ? 0 : -spacing[1] }]}>
        <DietChip />
        {!withIdeas ? (
          <Pressable onPress={openFood}>
            <Text size="sm" color="accent" weight="semiBold">
              Ideas ›
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Rings: a ring with its own words in the middle, as kcal won't fit Ring's count

function GoalRing({
  pct,
  centre,
  size = 64,
  stroke = 6,
}: {
  pct: number;
  centre: string;
  size?: number;
  stroke?: number;
}) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, pct));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.line} strokeWidth={stroke} fill="none" />
        {p > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colors.accent}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c * p} ${c}`}
          />
        ) : null}
      </Svg>
      <Text size={size >= 100 ? "xl" : "sm"} weight="bold">
        {centre}
      </Text>
    </View>
  );
}

function useRings() {
  const eaten = useEaten();
  return {
    eaten,
    kcal: { pct: eaten.kcal / targets.kcal, centre: fmt(targets.kcal - eaten.kcal), label: "kcal left" },
    protein: {
      pct: eaten.protein / targets.protein,
      centre: `${targets.protein - eaten.protein}`,
      label: "g protein left",
    },
    fibre: { pct: eaten.fibre / targets.fibre, centre: `${eaten.fibre}`, label: `of ${targets.fibre} g fibre` },
    water: { pct: eaten.water / targets.water, centre: litres(eaten.water), label: `of ${litres(targets.water)} L` },
  };
}

// The water ring is a button: each tap adds 250 ml
function WaterRing({ size = 64 }: { size?: number }) {
  const { water } = useRings();
  const { eaten } = useRings();
  return (
    <Pressable
      onPress={() => setProto({ water: eaten.water + 250 })}
      style={{ alignItems: "center", gap: 2 }}
      accessibilityLabel="Add 250 ml of water"
    >
      <GoalRing pct={water.pct} centre={water.centre} size={size} />
      <Text size="2xs" color="muted">
        {water.label}
      </Text>
      <Text size="2xs" color="accent" weight="semiBold">
        + 250 ml
      </Text>
    </Pressable>
  );
}

function RingRow({ size = 64 }: { size?: number }) {
  const rings = useRings();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      {[rings.kcal, rings.protein, rings.fibre].map((r) => (
        <Pressable key={r.label} onPress={openFood} style={{ alignItems: "center", gap: 2 }}>
          <GoalRing pct={r.pct} centre={r.centre} size={size} />
          <Text size="2xs" color="muted">
            {r.label}
          </Text>
        </Pressable>
      ))}
      <WaterRing size={size} />
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Today

export function TodayG() {
  // G: four even rings at the very top, the water one tapped for 250 ml, and the summary as one line under them
  return (
    <View style={{ gap: spacing[3], marginBottom: spacing[4] }}>
      <RingRow />
      <CoachSummary withIdeas={false} compact />
    </View>
  );
}

export function TodayH() {
  // H: one big kcal ring with the other three stacked beside it, then the summary with its two foods to add
  const { colors } = useTheme();
  const rings = useRings();
  return (
    <View style={{ gap: spacing[3], marginBottom: spacing[4] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[4] }}>
        <Pressable onPress={openFood} style={{ alignItems: "center" }}>
          <GoalRing pct={rings.kcal.pct} centre={rings.kcal.centre} size={120} stroke={10} />
          <Text size="xs" color="muted">
            kcal left
          </Text>
        </Pressable>
        <View style={{ flex: 1, gap: spacing[2] }}>
          {[rings.protein, rings.fibre].map((r) => (
            <View key={r.label} style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
              <GoalRing pct={r.pct} centre="" size={28} stroke={4} />
              <Text size="sm">{`${r.centre} ${r.label}`}</Text>
            </View>
          ))}
          <Pressable
            onPress={() => setProto({ water: rings.eaten.water + 250 })}
            style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}
          >
            <GoalRing pct={rings.water.pct} centre="" size={28} stroke={4} />
            <Text size="sm" style={{ flex: 1 }}>{`${rings.water.centre} ${rings.water.label}`}</Text>
            <View style={[styles.miniButton, { borderColor: colors.accent }]}>
              <Text size="xs" color="accent" weight="semiBold">
                +250
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
      <CoachSummary withIdeas />
    </View>
  );
}

export function TodayI() {
  // I: the coach speaks first, as a headline, with small rings under it and water as a button beside them
  const { colors } = useTheme();
  const eaten = useEaten();
  const diet = useDiet();
  const ideas = suggest(targets.kcal - eaten.kcal, diet);
  const { headline, line } = summary(eaten, ideas);
  return (
    <View style={{ gap: spacing[3], marginBottom: spacing[4] }}>
      <Pressable onPress={openFood} style={{ gap: spacing[1] }}>
        <Text size="xl" weight="bold">
          {headline}
        </Text>
        <Text size="sm" color="muted">
          {line}
        </Text>
      </Pressable>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
        <RingRowSmall />
        <DietChip />
      </View>
      <Pressable
        onPress={() => setProto({ water: eaten.water + 250 })}
        style={[styles.waterBar, { backgroundColor: colors.raised }]}
      >
        <Text
          size="sm"
          weight="semiBold"
          style={{ flex: 1 }}
        >{`Water ${litres(eaten.water, 2)} of ${litres(targets.water, 2)} L`}</Text>
        <Text size="sm" color="accent" weight="semiBold">
          + 250 ml
        </Text>
      </Pressable>
    </View>
  );
}

function RingRowSmall() {
  const rings = useRings();
  return (
    <View style={{ flexDirection: "row", gap: spacing[3], flex: 1 }}>
      {[
        [rings.kcal, "kcal"],
        [rings.protein, "protein"],
        [rings.fibre, "fibre"],
      ].map(([r, label]) => (
        <View key={label as string} style={{ alignItems: "center" }}>
          <GoalRing pct={(r as { pct: number }).pct} centre="" size={32} stroke={4} />
          <Text size="2xs" color="muted">
            {label as string}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Food

function SearchBar() {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: spacing[2] }}>
      <View style={[styles.search, { borderColor: colors.inputBorder }]}>
        <Icon name="search" size={18} />
        <TextInput
          placeholder="Search foods"
          placeholderTextColor={colors.subtle}
          style={{ flex: 1, color: colors.text }}
        />
      </View>
      <Pressable style={[styles.scan, { backgroundColor: colors.accent }]}>
        <Text weight="semiBold" color="onAccent">
          Scan
        </Text>
      </Pressable>
    </View>
  );
}

function RecentChips() {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2] }}>
      {[...saved.map((s) => `★ ${s}`), ...recent].map((r) => (
        <View key={r} style={[styles.chip, { borderColor: colors.line, backgroundColor: colors.surface }]}>
          <Text size="sm">{r}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function BigHeader() {
  const rings = useRings();
  return (
    <View style={{ alignItems: "center", gap: spacing[3] }}>
      <GoalRing pct={rings.kcal.pct} centre={rings.kcal.centre} size={132} stroke={11} />
      <Text color="muted" style={{ marginTop: -spacing[2] }}>
        kcal left today
      </Text>
      <View style={{ flexDirection: "row", gap: spacing[6] }}>
        {[rings.protein, rings.fibre].map((r) => (
          <View key={r.label} style={{ alignItems: "center", gap: 2 }}>
            <GoalRing pct={r.pct} centre={r.centre} size={60} />
            <Text size="2xs" color="muted">
              {r.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Glasses() {
  const { colors } = useTheme();
  const { water } = useProto();
  const glasses = Math.ceil(targets.water / 250);
  const full = Math.floor(water / 250);
  return (
    <View style={{ gap: spacing[2] }}>
      <Text
        size="xs"
        color="muted"
        weight="semiBold"
      >{`WATER · ${litres(water, 2)} of ${litres(targets.water, 2)} L · tap a glass`}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {Array.from({ length: glasses }, (_, i) => (
          <Pressable
            key={i}
            onPress={() => setProto({ water: (i + 1) * 250 })}
            style={[
              styles.glass,
              { borderColor: colors.accent, backgroundColor: i < full ? colors.accent : "transparent" },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function TodaySoFar({ startOpen }: { startOpen?: string }) {
  const { colors } = useTheme();
  const eaten = useEaten();
  const [open, setOpen] = useState<string | null>(startOpen ?? null);
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={{ gap: 2 }}>
        <Text weight="semiBold">Today so far</Text>
        <Text
          size="sm"
          color="muted"
        >{`${fmt(eaten.kcal)} kcal · ${eaten.protein} g protein · ${eaten.fibre} g fibre`}</Text>
      </View>
      {meals.map((m) => (
        <View
          key={m.name}
          style={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderColor: colors.line,
            paddingTop: spacing[2],
            gap: spacing[1],
          }}
        >
          <Pressable onPress={() => setOpen(open === m.name ? null : m.name)} style={styles.rowBetween}>
            <Text size="sm" weight="semiBold">
              {m.name}
            </Text>
            <Text size="sm" color="muted">
              {m.entries.length
                ? `${m.entries.length} foods · ${mealKcal(m)} kcal  ${open === m.name ? "▲" : "▼"}`
                : "Copy yesterday's"}
            </Text>
          </Pressable>
          {open === m.name ? (
            <>
              {m.entries.map((e) => (
                <View key={e.name} style={styles.rowBetween}>
                  <Text size="sm" color="muted" style={{ flex: 1 }}>{`${e.name}, ${e.portion}`}</Text>
                  <Text size="sm" color="muted">
                    {e.kcal}
                  </Text>
                </View>
              ))}
              <Text size="sm" color="accent">{`+ Add to ${m.name.toLowerCase()}`}</Text>
            </>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function Day() {
  const [offset, setOffset] = useState(0);
  const label = offset === 0 ? "Today" : offset === -1 ? "Yesterday" : `${-offset} days ago`;
  return (
    <View style={styles.rowBetween}>
      <Pressable disabled={offset <= -6} onPress={() => setOffset(offset - 1)} style={{ padding: spacing[1] }}>
        <Text color={offset <= -6 ? "subtle" : "accent"}>◀</Text>
      </Pressable>
      <Text weight="semiBold">{label}</Text>
      <Pressable disabled={offset >= 0} onPress={() => setOffset(offset + 1)} style={{ padding: spacing[1] }}>
        <Text color={offset >= 0 ? "subtle" : "accent"}>▶</Text>
      </Pressable>
    </View>
  );
}

const page = { padding: spacing[4], gap: spacing[4], paddingBottom: 120 };

export function FoodG() {
  // G: B's page top to bottom (rings, glasses), with C's search on top and its Today so far in place of B's list,
  // and the summary with ideas last, as what to eat next
  return (
    <ScrollView contentContainerStyle={page}>
      <SearchBar />
      <RecentChips />
      <Day />
      <BigHeader />
      <Glasses />
      <TodaySoFar />
      <CoachSummary withIdeas />
    </ScrollView>
  );
}

export function FoodH() {
  // H: the summary leads, straight under the search: what's left and what to eat, then the rings and the day
  return (
    <ScrollView contentContainerStyle={page}>
      <SearchBar />
      <CoachSummary withIdeas />
      <Day />
      <RingRow size={60} />
      <TodaySoFar startOpen="Lunch" />
      <RecentChips />
    </ScrollView>
  );
}

export function FoodI() {
  // I: two halves. "Add" (search, recent, ideas) and "Today" (rings, glasses, the day), switched at the top
  const { colors } = useTheme();
  const [half, setHalf] = useState<"add" | "today">("today");
  return (
    <ScrollView contentContainerStyle={page}>
      <SearchBar />
      <View style={[styles.segment, { backgroundColor: colors.raised }]}>
        {(["today", "add"] as const).map((h) => (
          <Pressable
            key={h}
            onPress={() => setHalf(h)}
            style={[styles.segmentItem, half === h && { backgroundColor: colors.surface }]}
          >
            <Text size="sm" weight="semiBold" color={half === h ? "text" : "muted"}>
              {h === "today" ? "Today so far" : "Ideas and recent"}
            </Text>
          </Pressable>
        ))}
      </View>
      {half === "today" ? (
        <>
          <Day />
          <BigHeader />
          <Glasses />
          <TodaySoFar />
        </>
      ) : (
        <>
          <CoachSummary withIdeas />
          <Text size="xs" color="muted" weight="semiBold">
            RECENT AND SAVED
          </Text>
          <RecentChips />
        </>
      )}
    </ScrollView>
  );
}

// Three equal rings, as H's row has, without its water ring: water keeps its glasses
function ThreeRings() {
  const rings = useRings();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
      {[rings.kcal, rings.protein, rings.fibre].map((r) => (
        <View key={r.label} style={{ alignItems: "center", gap: 2 }}>
          <GoalRing pct={r.pct} centre={r.centre} size={72} stroke={7} />
          <Text size="2xs" color="muted">
            {r.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function FoodJ() {
  // J, the picks: I's two halves. Today so far: the day, three equal rings, the water glasses, then the search
  // and Today so far's meals. Ideas and recent: the summary with its ideas, then recent and Saved Foods
  const { colors } = useTheme();
  const [half, setHalf] = useState<"today" | "add">("today");
  return (
    <ScrollView contentContainerStyle={page}>
      <View style={[styles.segment, { backgroundColor: colors.raised }]}>
        {(["today", "add"] as const).map((h) => (
          <Pressable
            key={h}
            onPress={() => setHalf(h)}
            style={[styles.segmentItem, half === h && { backgroundColor: colors.surface }]}
          >
            <Text size="sm" weight="semiBold" color={half === h ? "text" : "muted"}>
              {h === "today" ? "Today so far" : "Ideas and recent"}
            </Text>
          </Pressable>
        ))}
      </View>
      {half === "today" ? (
        <>
          <Day />
          <ThreeRings />
          <Glasses />
          <SearchBar />
          <TodaySoFar />
        </>
      ) : (
        <>
          <CoachSummary withIdeas />
          <Text size="xs" color="muted" weight="semiBold">
            RECENT AND SAVED
          </Text>
          <RecentChips />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing[4], borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, gap: spacing[3] },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  coachIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  chip: { paddingHorizontal: spacing[3], paddingVertical: 6, borderRadius: radii.pill, borderWidth: 1 },
  miniButton: { borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing[2], paddingVertical: 2 },
  waterBar: { flexDirection: "row", alignItems: "center", padding: spacing[3], borderRadius: radii.md },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    height: 44,
  },
  scan: { borderRadius: radii.md, paddingHorizontal: spacing[4], justifyContent: "center" },
  glass: { width: 22, height: 30, borderWidth: 2, borderRadius: 4 },
  segment: { flexDirection: "row", borderRadius: radii.md, padding: 3 },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: spacing[2], borderRadius: radii.sm },
});
