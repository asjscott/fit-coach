// Drives the mobile app's web build with Playwright (the app's own @playwright/test devDependency), at
// iPhone 13 size. Run from apps/mobile:
//   node .claude/skills/run-mobile/driver.mjs auth                      headed window; a human signs in, the session is saved
//   node .claude/skills/run-mobile/driver.mjs shot <route> [--dark] [--tall] [--wide]
//   node .claude/skills/run-mobile/driver.mjs tour [light|dark]         every screen, plus a Workout logged but not saved
// Screenshots and the saved session land in .expo/run-mobile/ (gitignored). BASE_URL overrides the dev server's
// address (default http://localhost:8081)
/* global console, fetch, localStorage, process, URL */
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
  // The tab bar's items, at the bottom or in the side rail
  const tab = (name) =>
    page
      .getByRole("tab", { name, exact: true })
      .or(page.getByRole("link", { name, exact: true }))
      .first();
  return { ctx, page, snap, go, button, tab };
}

// Its label carries the elapsed time ("Resume workout, 12 min"), unlike Today's own Resume workout button
const resumePill = (page) => page.getByRole("button", { name: /^Resume workout, / });

if (cmd === "shot") {
  const route = args.find((a) => !a.startsWith("--")) ?? "/";
  const wide = args.includes("--wide");
  const { ctx, go, snap } = await open(args.includes("--dark") ? "dark" : "light", { wide });
  await go(route);
  // "/history?variant=broadcast&state=first" lands as history-broadcast-first-<scheme>.png
  const url = new URL(route, base);
  const name = [
    url.pathname === "/" ? "today" : url.pathname.slice(1).replaceAll("/", "_"),
    ...url.searchParams.values(),
  ];
  if (wide) name.push("wide");
  await snap(name.join("-"), { tall: args.includes("--tall") });
  await ctx.close();
}

// A finished Workout from an hour ago, as the Logbook stores it on the phone until it uploads
function pendingWorkout() {
  const startedAt = new Date(Date.now() - 60 * 60_000).toISOString();
  const endedAt = new Date(Date.now() - 15 * 60_000).toISOString();
  const sets = [10, 10, 8].map((reps) => ({ kind: "external", kg: 16, reps, loggedAt: startedAt }));
  return {
    id: "8f1d7c2e-3b4a-4c5d-9e6f-7a8b9c0d1e2f",
    startedAt,
    endedAt,
    workoutExercises: [{ slug: "goblet-squat", loadType: "external", sets }],
  };
}

if (cmd === "tour") {
  if (!fs.existsSync(statePath)) console.log("No saved session: signed-in screens will redirect to /sign-in");
  for (const scheme of args[0] ? [args[0]] : ["light", "dark"]) {
    const { ctx, page, snap, go, button, tab } = await open(scheme);
    try {
      // Each tab, reached by pressing it in the tab bar rather than by URL
      await go("/");
      for (const [title, name] of [
        ["Today", "today"],
        ["History", "history"],
        ["Exercises", "exercises"],
        ["Profile", "profile"],
      ]) {
        await tab(title).click();
        await snap(name);
        await snap(name, { tall: true });
      }
      // Today's other states, by standing in for the History request: a first run (no Workouts), and offline
      // (History fails), first with nothing on the phone and then with a Pending Workout from earlier today
      const history = "**/workouts*";
      await page.route(history, (route) => route.fulfill({ json: [] }));
      await go("/");
      await snap("today-first-run");
      await page.unroute(history);
      await page.route(history, (route) => route.abort("internetdisconnected"));
      await go("/");
      await snap("today-offline");
      await page.evaluate(
        (workout) => localStorage.setItem("logbook:pending", JSON.stringify([workout])),
        pendingWorkout(),
      );
      await go("/");
      await snap("today-offline-pending");
      await page.evaluate(() => localStorage.removeItem("logbook:pending"));
      await page.unroute(history);

      for (const [route, name] of [
        ["/onboarding", "onboarding"],
        ["/profile/styleguide", "styleguide"],
      ]) {
        await go(route);
        await snap(name);
        await snap(name, { tall: true });
      }

      // Rows are Pressables calling router.push, not <a href>, so click through rather than following links
      await go("/exercises");
      // Show all adds the Exercises the equipment doesn't support, each with what it needs
      await page.getByRole("switch", { name: "Show all exercises" }).click();
      await snap("exercises-all");
      await page.getByText("Goblet squat", { exact: true }).first().click();
      await snap("exercise-detail");
      await go("/history");
      // Each History row ends "3 sets · 45 min"; clicking it presses the row. The detail's ⋯ menu holds
      // Delete workout: the tour opens it and closes it again, never deleting
      const firstWorkout = page.getByText(/^\d+ sets? · /).first();
      if (await firstWorkout.count()) {
        await firstWorkout.click();
        await snap("history-detail");
        await snap("history-detail", { tall: true });
        await button("Workout actions").click();
        await snap("history-detail-menu");
        await page.getByLabel("Close", { exact: true }).click();
      }

      // The Workout lives in this throwaway context's storage and is never saved, so nothing reaches the account.
      // Before it starts, /workout offers to start one
      await go("/workout");
      await snap("workout-none");
      // Previous Sets come from the API when an Exercise is added. Goblet squat shows the account's own, or a
      // canned answer when the account has none, so its faded "Last: …" line always shows; Plank shows the
      // account's own, if any
      await page.route(/\/workouts\/previous-sets\?/, async (route) => {
        const response = await route.fetch();
        const slug = new URL(route.request().url()).searchParams.get("slug");
        if (slug !== "goblet-squat" || (response.ok() && (await response.json()) !== null)) {
          return route.fulfill({ response });
        }
        const day = new Date(Date.now() - 3 * 86_400_000);
        const at = (minutes) => new Date(day.getTime() + minutes * 60_000).toISOString();
        const set = (reps, minutes) => ({ kind: "external", kg: 14, reps, loggedAt: at(minutes) });
        await route.fulfill({
          json: { startedAt: at(0), endedAt: at(45), sets: [set(10, 5), set(10, 8), set(8, 11)] },
        });
      });
      await go("/");
      await button(/^(Start|Resume) workout$/).click();
      await page.waitForURL(/\/workout$/);
      await snap("workout-empty");
      await button("Add exercise").click();
      await page.waitForURL(/add-exercise/);
      await snap("add-exercise");
      await page.getByPlaceholder("Search exercises").fill("squat");
      await snap("add-exercise-search");
      await page.getByPlaceholder("Search exercises").fill("goblet");
      // Today stays mounted under the Workout, and its Last workout rows name Exercises too: click the visible one
      await page.getByText("Goblet squat", { exact: true }).locator("visible=true").first().click();
      await page.waitForURL(/\/workout$/);
      await page
        .getByText(/^Last: /)
        .locator("visible=true")
        .first()
        .waitFor();
      await snap("workout-previous-sets");
      // The current Exercise's steppers are labelled by field (kg, reps, seconds); the next Set starts from the
      // previous one, so Set 2 is two taps of "Minus 1 rep"
      await page.getByLabel("kg", { exact: true }).fill("16");
      await page.getByLabel("reps", { exact: true }).fill("10");
      await button("Log set 1").click();
      await page.waitForTimeout(800);
      await button("Minus 1 rep").click();
      await button("Minus 1 rep").click();
      await snap("workout-logging");
      await button("Log set 2").click();
      await page.waitForTimeout(800);
      // Pressing a logged Set opens it for correcting or deleting
      await page.getByRole("button", { name: /^Set 1, / }).click();
      await snap("workout-edit-set");
      await button("Cancel").click();
      await button("Add exercise").click();
      await page.waitForURL(/add-exercise/);
      await page.getByPlaceholder("Search exercises").fill("plank");
      await page.getByText("Plank", { exact: true }).locator("visible=true").first().click();
      await page.waitForURL(/\/workout$/);
      await page.getByLabel("seconds", { exact: true }).fill("45");
      await button("Log set 1").click();
      await snap("workout-in-progress");
      await snap("workout-in-progress", { tall: true });
      // The other Exercises are rows; pressing one makes it current. Reorder and remove live in each ⋯ menu,
      // Discard workout in the header's: the tour opens them and closes them again
      await page.getByRole("button", { name: /^Goblet squat, / }).click();
      await snap("workout-switched");
      await button("Plank actions").click();
      await snap("workout-exercise-menu");
      await page.getByLabel("Close", { exact: true }).click();
      await button("Workout actions").click();
      await snap("workout-menu");
      await page.getByLabel("Close", { exact: true }).click();
      await button("Finish").click();
      await page.waitForURL(/finish/);
      await snap("workout-finish");
      // Edit times opens the web's date and time inputs. An end the day before the start is refused, so
      // Save workout leaves the Workout in progress with the error under End
      await button("Edit times").click();
      await snap("workout-finish-edit-times");
      const end = page.getByLabel("End date", { exact: true });
      const dayBefore = new Date(`${await end.inputValue()}T12:00`);
      dayBefore.setDate(dayBefore.getDate() - 1);
      await end.fill(dayBefore.toLocaleDateString("en-CA"));
      await button("Save workout").click();
      await page.getByText("The end must be after the start").waitFor();
      await snap("workout-finish-end-error");
      // Leaving keeps the Workout running and returns to the tab it was started from
      await page.goBack();
      await page.waitForURL(/\/workout$/);
      await button("Leave workout").click();
      await page.waitForURL((u) => u.pathname === "/");
      await snap("today-resume");
      // The Resume pill follows the running Workout to every tab and reopens it
      await tab("History").click();
      await snap("history-resume");
      await resumePill(page).click();
      await page.waitForURL(/\/workout$/);
      await button("Leave workout").click();
      await page.waitForURL((u) => u.pathname === "/history");
    } catch (e) {
      console.log(`[${scheme}] FAILED at ${page.url()}: ${e.message.split("\n")[0]}`);
      await page.screenshot({ path: `${shots}/_failure-${scheme}.png` });
      process.exitCode = 1;
    }
    await ctx.close();

    // A desktop window: the centred column, with the tabs in a side rail
    const wide = await open(scheme, { wide: true });
    try {
      for (const [route, name] of [
        ["/", "today-wide"],
        ["/profile", "profile-wide"],
      ]) {
        await wide.go(route);
        await wide.snap(name);
      }
      // With a Workout running, the Resume pill sits at the foot of the side rail
      await wide.go("/");
      await wide.button("Start workout").click();
      await wide.page.waitForURL(/\/workout$/);
      await wide.button("Leave workout").click();
      await wide.tab("Exercises").click();
      await resumePill(wide.page).waitFor();
      await wide.snap("exercises-resume-wide");
    } catch (e) {
      console.log(`[${scheme}] FAILED at ${wide.page.url()}: ${e.message.split("\n")[0]}`);
      await wide.page.screenshot({ path: `${shots}/_failure-wide-${scheme}.png` });
      process.exitCode = 1;
    }
    await wide.ctx.close();
  }
}

await browser.close();
