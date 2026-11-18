import type { IconName } from "@/components/icons";

// The tab bar, in order. The Exercise library is the first row in Profile, not a tab, so Food fits without five
// tabs (#159)
export const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: "index", title: "Today", icon: "home" },
  { name: "history", title: "History", icon: "calendar" },
  { name: "profile", title: "Profile", icon: "user" },
];
