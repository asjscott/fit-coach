// Drives the mobile app's web build with Playwright (the app's own @playwright/test devDependency), at
// iPhone 13 size. Run from apps/mobile:
//   node .claude/skills/run-mobile/driver.mjs auth                      headed window; a human signs in, the session is saved
//   node .claude/skills/run-mobile/driver.mjs shot <route> [--dark] [--tall] [--wide]
//   node .claude/skills/run-mobile/driver.mjs tour [light|dark]         every screen, plus a Workout logged but not saved
// Screenshots and the saved session land in .expo/run-mobile/ (gitignored). BASE_URL overrides the dev server's
// address (default http://localhost:8081)
/* global console, fetch, process, URL */
import { chromium, devices } from "@playwright/test";
import fs from "node:fs";

const base = process.env.BASE_URL ?? "http://localhost:8081";
const dir = ".expo/run-mobile";
const shots = `${dir}/shots`;
const statePath = `${dir}/auth-state.json`;
// The device's defaultBrowserType (WebKit) is a launch option, not a context one; Chromium is what's installed
const phone = { ...devices["iPhone 13"] };
delete phone.defaultBrowserType;
fs.mkdirSync(shots, { recursive: true });

const [cmd, ...args] = process.argv.slice(2);

async function serverUp() {
  try {
    return (await fetch(base)).ok;
  } catch {
    return false;
  }
}

if (!(await serverUp())) {
  console.error(`No dev server at ${base}. Start one first (see SKILL.md)`);
  process.exit(1);
}

if (cmd === "auth") {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 420, height: 860 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/sign-in`);
  console.log("Sign in in the browser window (waiting up to 10 min)...");
  // Clerk's Account Portal redirects back to the app once signed in
  await page.waitForURL((u) => u.origin === base && !/^\/sign-(in|up)/.test(u.pathname), { timeout: 600_000 });
  await page.waitForTimeout(5000);
  await ctx.storageState({ path: statePath });
  console.log(`Signed in; session saved to ${statePath}`);
  await browser.close();
  process.exit(0);
}

if (cmd !== "shot" && cmd !== "tour") {
  console.error("Usage: driver.mjs auth | shot <route> [--dark] [--tall] [--wide] | tour [light|dark]");
  process.exit(1);
}

const browser = await chromium.launch();

// --wide: a desktop browser window instead of the phone
const desktop = { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 };

async function open(scheme, { wide = false } = {}) {
  const ctx = await browser.newContext({
    ...(wide ? desktop : phone),
    colorScheme: scheme,
    ...(fs.existsSync(statePath) ? { storageState: statePath } : {}),
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log(`[${scheme}] pageerror on ${page.url()}: ${e.message.split("\n")[0]}`));
  // React Native Web scrolls an inner view, so fullPage screenshots stop at the fold: render in a tall viewport
  // instead. Bottom-pinned buttons then sit far below the content, which a real phone doesn't do
  const snap = async (name, { tall = false } = {}) => {
    await page.waitForTimeout(1500);
    if (tall) {
      await page.setViewportSize({ width: phone.viewport.width, height: 2400 });
      await page.waitForTimeout(1500);
    }
    const path = `${shots}/${name}${tall ? "-full" : ""}-${scheme}.png`;
    await page.screenshot({ path });
    if (tall) await page.setViewportSize(phone.viewport);
    console.log(`${path}  (${new URL(page.url()).pathname})`);
  };
  const go = async (route) => {
    await page.goto(base + route);
    await page.waitForTimeout(3500);
  };
  // LoadingButton renders as a link when given href, a button otherwise
  const button = (name) =>
    page
      .getByRole("button", { name, exact: true })
      .or(page.getByRole("link", { name, exact: true }))
      .first();
  return { ctx, page, snap, go, button };
}

if (cmd === "shot") {
  const route = args.find((a) => !a.startsWith("--")) ?? "/";
  const wide = args.includes("--wide");
  const { ctx, go, snap } = await open(args.includes("--dark") ? "dark" : "light", { wide });
  await go(route);
  // "/history?variant=broadcast&state=first" lands as history-broadcast-first-<scheme>.png
  const url = new URL(route, base);
  const name = [
    url.pathname === "/" ? "home" : url.pathname.slice(1).replaceAll("/", "_"),
    ...url.searchParams.values(),
  ];
  if (wide) name.push("wide");
  await snap(name.join("-"), { tall: args.includes("--tall") });
  await ctx.close();
}

if (cmd === "tour") {
  if (!fs.existsSync(statePath)) console.log("No saved session: signed-in screens will redirect to /sign-in");
  for (const scheme of args[0] ? [args[0]] : ["light", "dark"]) {
    const { ctx, page, snap, go, button } = await open(scheme);
    try {
      for (const [route, name] of [
        ["/", "home"],
        ["/exercises", "exercises"],
        ["/history", "history"],
        ["/onboarding", "onboarding"],
        ["/styleguide", "styleguide"],
      ]) {
        await go(route);
        await snap(name);
        await snap(name, { tall: true });
      }

      // Rows are Pressables calling router.push, not <a href>, so click through rather than following links
      await go("/exercises");
      await page.getByText("Goblet squat", { exact: true }).first().click();
      await snap("exercise-detail");
      await go("/history");
      // Each History row shows its duration; clicking it presses the row
      const firstWorkout = page.getByText(/^\d+ min$/).first();
      if (await firstWorkout.count()) {
        await firstWorkout.click();
        await snap("history-detail");
      }

      // The Workout lives in this throwaway context's storage and is never saved, so nothing reaches the account
      await go("/");
      await button(/^(Start|Resume) workout$/).click();
      await page.waitForURL(/\/workout$/);
      await snap("workout-empty");
      await button("Add exercise").click();
      await page.waitForURL(/add-exercise/);
      await snap("add-exercise");
      await page.getByPlaceholder("Search exercises").fill("goblet");
      await page.getByText("Goblet squat", { exact: true }).first().click();
      await page.waitForURL(/\/workout$/);
      for (const [kg, reps] of [
        ["16", "10"],
        ["16", "8"],
      ]) {
        await page.getByPlaceholder("kg").last().fill(kg);
        await page.getByPlaceholder("reps").last().fill(reps);
        await button("Log set").click();
        await page.waitForTimeout(800);
      }
      await button("Add exercise").click();
      await page.waitForURL(/add-exercise/);
      await page.getByPlaceholder("Search exercises").fill("plank");
      await page.getByText("Plank", { exact: true }).first().click();
      await page.waitForURL(/\/workout$/);
      await page.getByPlaceholder("seconds").last().fill("45");
      await button("Log set").click();
      await snap("workout-in-progress");
      await snap("workout-in-progress", { tall: true });
      await button("Finish").click();
      await page.waitForURL(/finish/);
      await snap("workout-finish");
    } catch (e) {
      console.log(`[${scheme}] FAILED at ${page.url()}: ${e.message.split("\n")[0]}`);
      await page.screenshot({ path: `${shots}/_failure-${scheme}.png` });
      process.exitCode = 1;
    }
    await ctx.close();
  }
}

await browser.close();
