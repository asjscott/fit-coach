# Manual checks on the phone

Checks still to run on a phone. Everything else has passed and been removed; `git log -p docs/manual-checks.md` has the past results.

For each check, tick the box and fill in the result. Leave **Notes** empty when it passes cleanly; write what you saw when it doesn't, or when something felt off even if it technically passed.

Result codes: **✅ pass** · **❌ fail** · **⚠️ works but feels off** · **⏭ skipped / couldn't test** · **🕒 skip for now: needs time to pass**

## What's left

- **Run on the phone now:** R1, U1, U2, LS2, PR1. Each is a part no run has covered yet.
- **M7, on the phones:** WI4, WI6, F4, FL6, SC3, SC4, TC4, FI6, TB2, NA1. Session 5 passed the rest of M7 on the simulators and phones; these are the parts not yet seen, and the offline checks again after #170–#174.
- **Run when you next train:** P9 and S1, a full Workout with a timer, resting as the timer says. Both can be one session.
- **🕒 Due later, while you use the app:** C5 (the day after a check-in), P16 (a Monday), J2 (after a week with jumps on), P17 (after a few weeks), DL1 and DL2 (the 5th week of a Block: the week starting 4 Mondays after the Monday of the week Assessment B was done).
- **On hold:** E1–E3 need Sentry set up on production.

## Session

- Date:
- Device(s) and OS version:
- Build:
- Branch and commit:

## Setting up the phones

### What you're building, and why

- **A Release build.** Its JavaScript is inside the app, so it opens with no Metro and no signal, which the airplane-mode checks need. Expo Go and `pnpm ios` can't do that, and a development build keeps the screen awake the whole time.
- **It talks to the API on your Mac, over Wi-Fi.**
  - Production (Render and Cloudflare) runs `main`, and `dev` isn't deployed anywhere, by choice.
  - So the Mac stays awake, with its lid open, on the same Wi-Fi as the phones, with the API running for the whole session.
  - Offline checks still work: the phone keeps the Workout Pending and uploads it when it's back on the Mac's Wi-Fi.
- **Changed the app's code?** Rebuild and reinstall (step 10 or 14): a Release build doesn't reload. The API restarts by itself when its code changes.
- **At home.** Away from the Mac's Wi-Fi, the app logs offline but can't upload or get a new plan until it's back.

### Once, before the first session

1. **`.env` files.** `apps/api/.env` and `apps/mobile/.env` exist, filled in from their `.env.example`.
   - `apps/mobile/.env` needs `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.
   - `CLERK_STUB` must not be set anywhere: these builds use the real Clerk development instance.
2. **Check which database you'll change.**
   - `apps/api/.env`'s `MONGODB_URI` is the database these checks use.
   - When the API starts from `dev`, it runs any new migrations on that database.
   - Production's API on Render runs `main`. Make sure it doesn't use the same `MONGODB_URI`, or the `dev` API's migrations change what production reads. Check its environment variables in Render.
3. **Seed the Exercise library**, from the repo root:

   ```bash
   pnpm --filter @fit/api seed:exercises
   ```

   It adds the jumps, the Recovery Exercises and the library gaps that the checks use. It's safe to run again.

4. **A test account** on the Clerk development instance: any email with `+clerk_test` in it, such as `you+clerk_test@example.com`, signs in with the code `424242`.

**iPhone, once**

5. In Xcode, open **Settings → Apple Accounts** (**Accounts** in older Xcode). Press **+** and add your Apple ID. A free one works: it shows up as "Your Name (Personal Team)".
6. Plug the phone into the Mac, unlock it and tap **Trust**. In Xcode, open **Window → Devices and Simulators** and wait until the phone appears. Then on the phone, go to **Settings → Privacy & Security → Developer Mode**. Turn it on, let the phone restart, then tap **Turn On** after unlocking.

**Android phone, once**

7. **Settings → About phone**: tap **Build number** 7 times. Then in **Settings → System → Developer options**, turn on **USB debugging**. Plug the phone in and allow debugging from this Mac. This should list it as `device`:

   ```bash
   ~/Library/Android/sdk/platform-tools/adb devices
   ```

### Each session: start the API

8. Put the Mac and both phones on the same Wi-Fi. From the repo root, start the API. `caffeinate` keeps the Mac from sleeping while it runs:

   ```bash
   caffeinate -i pnpm --filter @fit/api dev
   ```

   Leave it running in its own terminal. It reads `apps/api/.env` and listens on port 3000.

9. Find the Mac's addresses. The iPhone uses its name, and the Android phone uses its IP address:

   ```bash
   echo "iPhone:  http://$(scutil --get LocalHostName).local:3000"
   ```

   ```bash
   echo "Android: http://$(ipconfig getifaddr en0):3000"
   ```

   On each phone, open its address with `/health` on the end in the browser. You should see `"status":"ok"`. If it doesn't load, the app can't reach the API either: check the Wi-Fi, and that the macOS firewall lets `node` accept connections (System Settings → Network → Firewall).

### Build and install: iPhone

10. **Plug in and unlock the phone.** From `apps/mobile`, build and install. Keep the existing `ios/` folder.
    - Your 9 Nov build already set it up: bundle identifier `com.asjscott.mobile`, and Sign in with Apple removed.
    - **`expo-camera` is new native code (#164), with a camera permission in `app.json`.** Once, before this build, run `pnpm install`, then `npx expo prebuild --platform ios` so `ios/` gets it, then remove Sign in with Apple again (below). On Android, run `npx expo prebuild --platform android` and redo step 13.
    - **The Expo packages moved to 58.0.26 with it** (the precompiled camera needs the newer ExpoModulesCore, or the app crashes at launch). An existing `ios/` keeps the old React Native it locked, which crashes the same way ("Symbol not found: _OBJC_CLASS_$_RCTStatusBarAppearance"): from `apps/mobile`, run `rm -rf ios/Pods ios/Podfile.lock` before the build so CocoaPods installs afresh.
    - The `LANG` settings stop CocoaPods failing (the error is easy to miss).
    - `EXPO_PUBLIC_API_URL` overrides `.env` for this build only.

    ```bash
    LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 EXPO_PUBLIC_API_URL="http://$(scutil --get LocalHostName).local:3000" npx expo run:ios --configuration Release --device
    ```

    - Pick your iPhone from the list, not a simulator.
    - If it asks for a signing team, pick your Personal Team.
    - The first build takes several minutes, and ends by installing the app on the phone.

    If it fails:
    - **On signing:** open `ios/mobile.xcworkspace` in Xcode and select the **mobile** target, then **Signing & Capabilities**. Tick **Automatically manage signing**, pick your team, and run the command again.
    - **"No Accounts"**, with **"No profiles for '…' were found"**: Xcode isn't signed in to an Apple account. Do step 5, then run the command again.
    - **"Personal development teams … do not support the Sign In with Apple capability"**: `@clerk/expo` adds Sign in with Apple to the build by default. The app doesn't use it, but a free Apple ID can't sign an app that asks for it. Remove it from the generated project, which isn't committed, then run the command again:

      ```bash
      /usr/libexec/PlistBuddy -c 'Delete :com.apple.developer.applesignin' ios/mobile/mobile.entitlements
      ```

    - **Starting `ios/` again:** run `rm -rf ios`, then the command again. It asks for a bundle identifier: enter `com.asjscott.mobile`. Then remove Sign in with Apple as above.

11. **First launch.**
    - If the phone says "Untrusted Developer", go to **Settings → General → VPN & Device Management**. Tap your Apple ID under Developer App, then **Trust**.
    - When the app asks to find devices on your local network, tap **Allow**. Without it, the app can't reach the API.
    - Sign in with the test account and finish the Assessment, so Today has a plan.

### Build and install: Android

12. **Plug in the phone.** From `apps/mobile`, generate `android/` once. It asks for a package name, as `app.json` has none: enter `com.asjscott.mobile`.

    ```bash
    npx expo prebuild --platform android
    ```

13. **Let the app use plain `http`.** A Release build on Android refuses `http://` by default, so the app couldn't reach the API on the Mac. This allows it in the generated manifest, which is gitignored, and does nothing if it's already allowed:

    ```bash
    grep -q usesCleartextTraffic android/app/src/main/AndroidManifest.xml || sed -i '' 's/<application /<application android:usesCleartextTraffic="true" /' android/app/src/main/AndroidManifest.xml
    ```

    Do it again whenever `android/` is removed and generated again.

14. **Build and install:**

    ```bash
    EXPO_PUBLIC_API_URL="http://$(ipconfig getifaddr en0):3000" npx expo run:android --variant release --device
    ```

    - Pick the phone from the list, not the emulator.
    - If the Mac's IP address changes (a new Wi-Fi network, or the next day), step 9's `/health` stops loading. Build again.
    - Then open the app, sign in with the test account and finish the Assessment.

### Airplane mode

- **iPhone:** iOS turns Wi-Fi back on in airplane mode if you've done that before. Check in Control Center that Wi-Fi and Bluetooth are both off, or the "offline" checks aren't offline.
- **Android:** check in Quick Settings that Wi-Fi is off too.
- **A USB cable** to the Mac doesn't carry the app's traffic, so it can stay plugged in.
- **To force-quit:**
  - iPhone: swipe up from the bottom, pause, then swipe the app's card away.
  - Android: open Recents and swipe the app away.

### Afterwards

- The bundle identifier and package name these builds wrote into `app.json` aren't for committing. Undo them, from `apps/mobile`, once you're done building for the phones:

  ```bash
  git checkout app.json
  ```

- With a free Apple ID, the iPhone app stops opening after 7 days. Run step 10 again to reinstall.

### Tooling: driving the simulators

- **iOS:** Claude Code's iOS Simulator tool taps, types and takes screenshots, and typing works there. Plain `xcrun simctl` gives screenshots, `openurl` and `ui … appearance` only. Expo Go's gear sits on the header ⋯: drag it out of the way.
- **Android:** `adb` (in `~/Library/Android/sdk/platform-tools`, not on `PATH`) works for taps, typing, screenshots and `uiautomator dump`. The Clerk custom tab's contents aren't in the uiautomator tree, but `adb forward tcp:9222 localabstract:chrome_devtools_remote` exposes the page over the Chrome DevTools Protocol.
- **Offline on the emulator:** `adb reverse` carries the app's traffic, so remove it (`adb reverse --remove-all`) and restart the adb server to cut open connections. Airplane mode alone isn't enough.

---

## Timing

- [ ] **P9** The estimated time is honest: run a full Standard Workout with a timer. The 5-minute warm-up is a spec assumption "unless it proves wrong on a phone".
  - Result: · Notes:

## Supersets (#96)

A Workout pairs Exercises only when it wouldn't otherwise fit its Length. Pairs form where the Patterns go together (push with pull or hinge, squat with core), never with a one-sided Exercise or a carry. On the simulators, Bodyweight only on Short paired them. The sheet then says "Paired into supersets to fit the time" and shows "Superset with …" under each paired Exercise.

- [ ] **S1** P9's timing check on a paired Workout: start one whose sheet shows at least one superset, note its "About N min", and run it in full with a timer, resting as the timer says and skipping nothing. A pair is timed at Sets × (the longer Exercise's Set + 30 s): does the real time come out within a few minutes of the estimate?
  - Result: · Notes:

## Daily check-in (#92)

- [ ] **C5** 🕒 The next day the check-in is gone: the card is back (if there's a plan) and the Workout is full.
  - Result: · Notes:

## Recovery Workout (#97)

- [ ] **R1** On a real Rest Day, Today shows the "Rest today." card with a "Recovery workout instead" link, which opens the Recovery Workout (a 20-minute walk, then four stretches). The Workout itself has passed from a training day's sheet; only the card hasn't been seen.
  - Result: · Notes:

## Units (#126, #148)

- [ ] **U1** On a home Equipment Profile with dumbbells but no weights entered, the load stepper moves by 5 lb, or 2 kg once kg is picked.
  - Result: · Notes:
- [ ] **U2** A new account's onboarding asks "Weight (lb)". After saving 180 lb in Edit profile, picking kg reads 81.6 kg on Profile, and Edit profile asks "Weight (kg)".
  - Result: · Notes:

## Load Steps (#127)

- [ ] **LS2** On a home Equipment Profile with a cable machine selected, the weights stage shows "Cable and machine step (lb)" next to the other equipment, and the step saved there moves the cable targets and stepper.
  - Result: · Notes:

## PRs (#130)

- [ ] **PR1** Beat an Exercise's best with signal and Save workout. While the "Workout saved. New PR: …" toast is up (about 10 s), tap **See workout**: it opens the Workout in History with "New PR · …" under that Exercise.
  - Result: · Notes:

## Jumps (#105)

- [ ] **J2** 🕒 Over a week with "Include jumps" on: the first 2 Workouts have jumps and the rest don't, and the second jump Workout has different jumps from the first. On a Quick Workout the jumps stay, all 3 Sets each, and something else is cut.
  - Result: · Notes:

## Over time

- [ ] **P16** 🕒 A new week: open the app on Monday. The plan is built for the new week, with nothing carried over.
  - Result: · Notes:
- [ ] **P17** 🕒 Week after week, do the same Exercises carry on, and do Previous Sets stay useful?
  - Result: · Notes:

## Deload week and the retest (#137)

🕒 In the 5th week of a Block: the week starting 4 Mondays after the Monday of the week the Assessment was done.

- [ ] **DL1** In the deload week, open the Next Workout sheet on Today: the Exercises and Sets are as usual, weighted targets about 10% lighter (on a real dumbbell, plate or stack step), and bodyweight, band and timed targets about 70% of last week's (never under 5 reps or 15 s unless they were already). Below the plan, a "Retake the Assessment" section explains that only the Exercises it tests, and any not done this Block, get new levels, with Start assessment. The wording reads well and doesn't feel pushy.
  - Result: · Notes:
- [ ] **DL2** Dismiss the retest with the ×: it stays gone for the rest of the week. On the Monday after, the plan is back to the usual loads and there's no retest. Or, instead, take it in the deload week: the Results open as usual, and next week an Exercise you trained this Block but the Assessment didn't test keeps the target it had reached.
  - Result: · Notes:

## M7: Weigh-ins, food and water (#161–#168)

Run each offline check (WI6, F4, FL6, TC4) twice: once with airplane mode on before the app opens, and once turning it on with the app already open. Either way, the connection message shows at once, with no spinner first (#171), and the app doesn't call the server while the phone says it has no network.

- [ ] **WI4** Log a Weigh-in for an earlier day this week, then another for today: Profile shows only the second, dated today, and the rings follow it. Log one for a day last week (when the days offered reach into it): Profile still shows this week's.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **WI6** Offline, Log weight's Save shows "Couldn't log your weight" and Profile keeps the weight it had. Back online, logging works. Cancel, and on the iPhone a swipe down, close the sheet at any time, even while Save is loading (#172).
  - iOS: Result: · Android: Result: · Notes:
- [ ] **F4** In airplane mode, a search says "Searching for food needs a connection." and nothing breaks; back online, searching again works.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **FL6** In airplane mode, open the Food tab (or step to another day): it says logging food needs a connection. With a day already showing, change a portion and Save, or Add a food: a toast says logging needs a connection and nothing was saved, and what you chose stays open to try again. Back online, Save or Add again: it's logged once, with nothing doubled.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **SC3** Scan a product Open Food Facts doesn't have (a store's own brand, or something small-batch): Create food opens, saying nothing has the barcode yet. Fill in the name, the serving ("1 bar", 45) and the label's kcal, protein, carbs and fat, leaving fibre empty, and tap Create food: it shows as "From your Saved Foods", opened on its serving with the figures you typed and 0 g fibre. Add it to a meal.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **SC4** Scan the same product again: it's found straight away as your Saved Food, without Create food. Search its name: it comes first, marked "Saved food", above the USDA results.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **TC4** In airplane mode, Tell says telling the Coach needs a connection, stops loading at once, and the words stay in the box (#173). Back online, Tell works.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **FI6** After 21:00, the idea buttons read "+ Snacks", and a Recent or Saved Food chosen on the Ideas half has Snacks picked for it.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **TB2** From Profile's "Exercise library", tap an Exercise: its detail opens. Back (the header's arrow, and on the iPhone a swipe from the left edge; on Android the system back) returns to the library, and again to Profile.
  - iOS: Result: · Android: Result: · Notes:

## When the server isn't answering (#170, #174)

Needs the phone online with the API stopped, or the server otherwise unreachable while the phone has a network.

- [ ] **NA1** With the app already open, stop the API, then search for a food, Save a food's portion and Log weight. Each stops loading within 15 s and says "Fit Coach isn't answering. Check your connection, or try again in a minute.", not that it needs a connection. Today, the Food tab and History say Fit Coach can't be reached, not "No connection". Start the API again: everything works without restarting the app.
  - iOS: Result: · Android: Result: · Notes:

## Sentry (#122)

On hold until Sentry is set up on production: see "Error reporting" in `docs/agents/workouts.md`. Run these on the installed web app on the iPhone, signed in.

- [ ] **E1** The web app: open `/debug-error` on the production web app (type it after the address in Safari). Within a minute, Sentry has "Test error from the web app (/debug-error)" under the production environment, with a stack trace and your Clerk user id (`user_…`) as the user, and no email, IP address or headers.
  - Result: · Notes:
- [ ] **E2** The API: the same page also asks the API to throw, and says "the API answered: … Test error from the API". Sentry has "Test error from the API (GET /debug/error)" under production, with a stack trace, the transaction `GET /debug/error` and your Clerk user id, and no headers, body or query string.
  - Result: · Notes:
- [ ] **E3** The local app and API (no DSN) send nothing to Sentry.
  - Result: · Notes:

## Your call

Not a bug, but it needs your judgement once you've done some Workouts. Details in `docs/research/planner-simulation.md`.

- With jumps on, 2 Short days a week lose most of their upper-body work to the jumps' 15 minutes (chest 1 of 12, side delts 0 of 8 in the simulation). Should the switch warn, or jumps give way, at 2 Short days? (2026-11-10)
- Do Workouts that fill their Length, at up to 214% of a Muscle's budget, feel like too much? Should a Workout stop at the budget? Left until after real use (2026-11-09).
- Pistol squat at "3 sets · 15 reps per side" looked heavy on the simulators. Does it feel right? (2026-11-13)

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

> Here are my manual test results. For each failed or ⚠️ check, and each problem in the write-up: say whether it's a bug, a spec gap, or working as intended, and draft a GitHub issue (title, steps to reproduce, expected, actual) for the ones that need fixing. Show me the drafts before posting anything.
