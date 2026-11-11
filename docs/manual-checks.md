# Manual checks on the phone

Checks still to run on the phone. The rest have passed.

Run from `apps/mobile` with `pnpm ios` / `pnpm android`. If something breaks, `apps/mobile/.expo/dev.log` has the error. Use a physical phone where you can: airplane mode is the point of the offline checks.

For each check, tick the box and fill in the result. Leave **Notes** empty when it passes cleanly; write what you saw when it doesn't, or when something felt off even if it technically passed.

Result codes: **✅ pass** · **❌ fail** · **⚠️ works but feels off** · **⏭ skipped / couldn't test**

## Session

- Date:
- Device(s) and OS version:
- Build (dev build / Expo Go / web, browser):
- Branch and commit:

## Before you start

- **Test accounts** on the Clerk dev instance: a `+clerk_test` email takes the code `424242`.

### A release build

Expo Go can't reload offline, and the repo has no EAS setup until M8, so build locally on your Mac. A Release build carries its JavaScript inside the app, so it opens with no Metro and no signal.

#### iPhone, step by step

The API deployed on Render runs `main`, which has no Planned Workouts, so the phone talks to an API on your Mac over Wi-Fi instead.

**Once, on the Mac**

1. In Xcode, open **Settings → Apple Accounts** (**Accounts** in older Xcode), press **+** and add your Apple ID. A free one works: it shows up as "Your Name (Personal Team)".

**Once, on the iPhone**

2. Plug the phone into the Mac with a cable, unlock it and tap **Trust** when it asks about this computer.
3. In Xcode, open **Window → Devices and Simulators** and wait until the phone appears. That makes **Developer Mode** show up on the phone.
4. On the phone: **Settings → Privacy & Security → Developer Mode**, turn it on, let it restart, then tap **Turn On** after unlocking.

**Each time: start the API**

5. Put the phone and the Mac on the same Wi-Fi. From the repo root, start the API with this branch's code. It reads `apps/api/.env`, so it uses the real database and the Clerk dev instance:

   ```bash
   pnpm --filter @fit/api dev
   ```

6. Find the Mac's name on the network:

   ```bash
   echo "$(scutil --get LocalHostName).local"
   ```

   In Safari on the phone, open `http://<that name>:3000/health`. You should see `"status":"ok"`. If it doesn't load, the phone can't reach the Mac, and the app won't be able to either: check the Wi-Fi, and that the macOS firewall lets `node` accept connections.

**Build and install**

7. From `apps/mobile`, remove the `ios/` folder if it's there. The simulator run left one with a made-up app identifier:

   ```bash
   rm -rf ios
   ```

8. With the phone still plugged in and unlocked, build and install. The `LANG` settings stop CocoaPods failing (the error is easy to miss), and `EXPO_PUBLIC_API_URL` overrides `.env` for this build only:

   ```bash
   LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 EXPO_PUBLIC_API_URL="http://$(scutil --get LocalHostName).local:3000" npx expo run:ios --configuration Release --device
   ```

   - Pick your iPhone from the list.
   - It asks for an iOS bundle identifier, as `app.json` has none. Enter one only you would use, such as `com.asjscott.fitcoach`. It writes it into `app.json`: don't commit that.
   - If it asks for a signing team, pick your Personal Team.
   - The first build takes several minutes. It ends by installing the app on the phone.
   - If it fails on signing, open `ios/mobile.xcworkspace` in Xcode, select the **mobile** target, then **Signing & Capabilities**: tick **Automatically manage signing**, pick your team, and run the command again.

   Signing errors you may hit:

   - **"No Accounts"**, together with **"No profiles for '…' were found"**: Xcode isn't signed in to any Apple account. Do step 1, then run the command again.
   - **"Personal development teams … do not support the Sign In with Apple capability"**: `@clerk/expo` adds Sign in with Apple to the build by default. The app doesn't use it, but a free Apple ID can't sign an app that asks for it. Remove it from the generated project (it isn't committed), then run the command again:

     ```bash
     /usr/libexec/PlistBuddy -c 'Delete :com.apple.developer.applesignin' ios/mobile/mobile.entitlements
     ```

     Removing `ios/` brings the setting back, so do this again after step 7.

**First launch**

9. If the phone says "Untrusted Developer": **Settings → General → VPN & Device Management**, tap your Apple ID under Developer App, then **Trust**.
10. Open the app. When it asks to find devices on your local network, tap **Allow**. Without it the app can't reach the API on your Mac.
11. Sign in with a test account and finish the Assessment, so Today has a plan. Run the checks from there.

**Airplane mode**

- iOS turns Wi-Fi back on in airplane mode if you've done that before. Check in Control Center that Wi-Fi and Bluetooth are both off, or the "offline" checks aren't offline.
- To force-quit, swipe up from the bottom, pause, then swipe the app's card away.

**Afterwards**

12. From `apps/mobile`, undo the bundle identifier in `app.json`:

    ```bash
    git checkout app.json
    ```

    With a free Apple ID the app stops opening after 7 days. Run step 8 again to reinstall.

#### Android

```bash
npx expo run:android --variant release --device
```

- The first run generates `android/`, which is gitignored, and asks for a package name, as `app.json` has none. Don't commit either.
- Same API rule as iOS: build with `EXPO_PUBLIC_API_URL` pointing at the Mac, not Render.

### Tooling: driving the simulators

- **iOS:** Claude Code's iOS Simulator tool taps, types and takes screenshots, and typing works there. Plain `xcrun simctl` gives screenshots, `openurl` and `ui … appearance` only. Expo Go's gear sits on the header ⋯: drag it out of the way.
- **Android:** `adb` (in `~/Library/Android/sdk/platform-tools`, not on `PATH`) works for taps, typing, screenshots and `uiautomator dump`. The Clerk custom tab's contents aren't in the uiautomator tree, but `adb forward tcp:9222 localabstract:chrome_devtools_remote` exposes the page over the Chrome DevTools Protocol.

---

## Timing

- [ ] **P9** The estimated time is honest: run a full Standard Workout with a timer. The 5-minute warm-up is a spec assumption "unless it proves wrong on a phone".
  - iOS: Result: · Android: Result: · Notes:

## Rest timer (#95)

`expo-keep-awake` is a new native module, so these need a new development or release build. Leave the phone's auto-lock at its usual setting (30 s to 1 min makes T2 quick).

- [ ] **T2** Rerun on both phones, on a Release build (`--configuration Release` / `--variant release`, not `pnpm ios`): a development build keeps the whole app awake. Don't watch the screen while you wait. Put the phone face down, or on iPhone turn off Settings › Face ID & Passcode › Attention Aware Features (on Android, Settings › Display › Screen attention). Either setting keeps the screen on while you look at it. Then:
  1. Before starting, leave the phone on Today past its auto-lock time: it locks. If it doesn't, the cause isn't the Workout, so note that and stop.
  2. Start a Workout and leave it on the logging screen, then on Today: the screen stays on.
  3. Finish, then leave it on Today and again on History: it dims and locks.
  4. Start another and Discard it, then leave it on Today: it locks.
  5. In airplane mode, start, log a Set and finish, so the Workout is Pending, then leave it on Today: it locks.
  - iOS: Result: · Android: Result: · Notes:

## Daily check-in (#92)

- [ ] **C5** The next day the check-in is gone: the card is back (if there's a plan) and the Workout is full.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **C6** (#125) In airplane mode, check in on Today: the Day's Workout follows the Readiness straight away, as online. Change the check-in once, still offline. Turn airplane mode off and bring the app to the foreground. The `checkIns` collection in the staging database has one document for today, with the changed ratings, not the first.
  - iOS: Result: · Android: Result: · Notes:

## Supersets (#96)

A Workout pairs Exercises only when it wouldn't otherwise fit its Length, so choose Quick or Short on a plan of four or more Exercises. Pairs only form where the Patterns go together (push with pull or hinge, squat with core), never with a one-sided Exercise or a carry, so a plan without such Exercises may need Bodyweight only to swap some in. The sheet then says "Paired into supersets to fit the time" and shows "Superset with …" under each paired Exercise.

- [ ] **S1** P9's timing check on a paired Workout: start one whose sheet shows at least one superset, note its "About N min", and run it in full with a timer, resting as the timer says and skipping nothing. A pair is timed at Sets × (the longer Exercise's Set + 30 s): does the real time come out within a few minutes of the estimate?
  - iOS: Result: · Android: Result: · Notes:

## Past Workouts (#129)

- [ ] **W1** On Today, tap "Log a past workout" under Start manual workout: a sheet asks "Which day was it?" with Yesterday and the five weekdays before it. Pick one: the Workout opens with "Done <that day>" under its title. Log a Set or two and tap Finish: the times read that day, an hour long, with Edit times already open. Set a start 8 days back and Save: "The start can't be more than 7 days ago" shows under Start. Set it back within the week and Save: in History the Workout sits on its own day, and This Week counts it only if that day is in this week. On the installed web app, check that the date and time inputs are easy to use on the iPhone.
  - iOS: Result: · Android: Result: · Notes:

## Sentry (#122)

Needs Sentry set up and staging deployed with its variables: see "Error reporting" in `docs/agents/workouts.md`. Run these on the installed web app on the iPhone, against staging, signed in with a test account.

- [ ] **E1** The web app: open `/debug-error` on the staging web app (type it after the address in Safari). Within a minute, Sentry has "Test error from the web app (/debug-error)" under the staging environment, with a stack trace and your Clerk user id (`user_…`) as the user, and no email, IP address or headers.
  - iPhone: Result: · Notes:
- [ ] **E2** The API: the same page also asks the staging API to throw, and says "the API answered: … Test error from the API". Sentry has "Test error from the API (GET /debug/error)" under staging, with a stack trace, the transaction `GET /debug/error` and your Clerk user id, and no headers, body or query string.
  - iPhone: Result: · Notes:
- [ ] **E3** Production stays apart: an error on staging never shows under production, and the local app (no DSN) sends nothing.
  - Result: · Notes:

## Over time

These need real weeks of training on `dev`, so run them while M5's gaps are built.

- [ ] **P16** A new week: open the app on Monday. The plan is built for the new week, with nothing carried over. The walk couldn't show this, as it can't move the server's clock, so wait for a real Monday.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **P17** Week after week, do the same Exercises carry on, and do Previous Sets stay useful?
  - iOS: Result: · Android: Result: · Notes:

## Recovery Workout (#97)

Needs `pnpm --filter @fit/api seed:exercises` run once from the main checkout (it needs `apps/api/.env`), so the Exercises tab lists the five Recovery Exercises.

- [ ] **R1** On a Rest Day, the "Rest today." card has a "Recovery workout instead" link. Tap it: a Workout opens with a 20-minute walk, then hip flexor stretch, open book, cat-cow and world's greatest stretch at 2 × 45 s each, logged on the normal timed-Set screen. The walk's target reads "1 set · 20 min". Log it: no rest timer starts, and in place of a Set 2 there's "Next exercise", which opens the hip flexor stretch. A stretch's Set still starts its usual rest (1:10), and still offers a Set 3 after its 2.
  - iOS: Result: · Android: Result: · Notes:

## Jumps (#105)

Needs `pnpm --filter @fit/api seed:exercises` run once from the main checkout (it needs `apps/api/.env`), so the Exercises tab lists the six jumps. Use an athletic profile with no knee or ankle injury, whose Assessment tested the squat rather than estimating it.

- [ ] **J1** Profile shows an "Include jumps" switch under Training, off, and only while the Goal is athletic. Turn it on, then open Today: the plan's sheet opens with two jumps, each "3 sets · N contacts" (for example "3 sets · 10 contacts"), one that goes up (pogo hop, squat or countermovement jump, box jump) and one that goes forward or sideways (broad jump or lateral bound). Start the Workout: the jumps come first. Log a jump Set: the stepper says "contacts", with no weight field, and the logged Set uploads. Turn the switch off: Today's plan has no jumps. Turning it back on, or a knee injury in the profile, also works as expected.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **J2** Over a week with the switch on: the first 2 Workouts have jumps and the rest don't, and the second jump Workout has different jumps from the first. On a Quick Workout the jumps stay, all 3 Sets each, and something else is cut.
  - iOS: Result: · Android: Result: · Notes:

## Units (#126)

- [ ] **U1** An existing account shows every load in lb with nothing chosen: Profile's "Weights in" has lb picked, and Today's plan, the logging screen (target, Last, Sets, stepper), History, a Workout's detail, Volume everywhere and the Equipment Profile's weights all read in lb. Log a Set of 25 lb: it reads 25 lb in the Set row, History and as Last next time, never 24.9. Pick kg on Profile: the same screens switch to kg, and the 25 lb Set reads 11.5 kg. With the loads unknown (a gym profile), the load stepper moves by 5 lb or 2 kg.
  - iOS: Result: · Android: Result: · Notes:

## Library gaps (#101)

Needs `pnpm --filter @fit/api seed:exercises` run once from the main checkout (it needs `apps/api/.env`), so the Exercises tab lists the six new Exercises.

- [ ] **L1** The Exercises tab lists Calf raise, Nordic hamstring curl, Dumbbell curl, Dumbbell overhead triceps extension, Cable knee extension and Table row, each with its cues. Switch Today to Bodyweight only: a back Exercise the plan had (a row or pull-up) offers Table row as its Alternative Exercise, where it used to offer nothing for a lats pull. With a build_muscle or athletic profile, the plan's reasons and Workouts don't break on calves, which are now in the Weekly Budget.
  - iOS: Result: · Android: Result: · Notes:

## Your call

Not a bug, but it needs your judgement once you've done some Workouts. Details in `docs/research/planner-simulation.md`.

- With jumps on, 2 Short days a week lose most of their upper-body work to the jumps' 15 minutes (chest 1 of 12, side delts 0 of 8 in the simulation). Should the switch warn, or jumps give way, at 2 Short days? (2026-11-10, see Jumps.)
- Do Workouts that fill their Length, at up to 214% of a Muscle's budget, feel like too much? Should a Workout stop at the budget? Left until after real use (2026-11-09).

---

## Write-up

Answer these after the run, while it's fresh. Short answers are fine.

1. Would you merge as it is? If not, what's the one thing that blocks it?
2. Which checks failed (IDs)? For each: what you did, what you expected, what happened, and whether it happens every time.
3. Which checks did you skip, and why?
4. Anything that broke or looked wrong that no check covers?
5. Any wording on screen that was confusing, too long, or didn't match what the app did? Quote it.
6. Did the Exercises, Set counts and targets feel believable for you? Too light, too heavy, or about right?
7. Any difference between iOS and Android worth noting?

### Handing it back to Claude

Paste this file, filled in, with the prompt below:

> Here are my manual test results for spec #77. For each failed or ⚠️ check, and each problem in the write-up: say whether it's a bug, a spec gap, or working as intended, and draft a GitHub issue (title, steps to reproduce, expected, actual) for the ones that need fixing. Show me the drafts before posting anything.
