import { describe, expect, it } from "vitest";
import { TABS } from "./tabs";

describe("TABS", () => {
  it("are Today, Food, History and Profile, in that order: the Exercise library is in Profile (#159, #162)", () => {
    expect(TABS.map((tab) => tab.title)).toEqual(["Today", "Food", "History", "Profile"]);
    expect(TABS.map((tab) => tab.name)).toEqual(["index", "food", "history", "profile"]);
  });
});
