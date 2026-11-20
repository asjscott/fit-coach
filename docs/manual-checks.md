# Manual checks on the phone

Checks still to run on a phone. Everything else has passed and been removed; `git log -p docs/manual-checks.md` has the past results.

For each check, tick the box and fill in the result. Leave **Notes** empty when it passes cleanly; write what you saw when it doesn't, or when something felt off even if it technically passed.

Result codes: **✅ pass** · **❌ fail** · **⚠️ works but feels off** · **⏭ skipped / couldn't test** · **🕒 skip for now: needs time to pass**

## What's left

- **Run on the phone now:** R1, U1, U2, LS2, PR1, TB1–TB3. Each is a part no run has covered yet.
- **M7, once it's on the phones:** DT1–DT5, WI1–WI6, F1–F4, FL1–FL6, SC1–SC6, CR1–CR6, WA1–WA5, FI1–FI6, TC1–TC5. Session 5 ran most of them on the simulators (see each check's notes). Still to see on a phone first: scanning (SC2–SC4, SC6), Tell the coach with a Gemini key (TC1–TC4), the pre-M7 account and Weigh-in Day row (WI1, WI2), WI6, F3, FL5, and every offline check on the iPhone.
- **Run when you next train:** P9 and S1, a full Workout with a timer, resting as the timer says. Both can be one session.
- **🕒 Due later, while you use the app:** C5 (the day after a check-in), P16 (a Monday), J2 (after a week with jumps on), P17 (after a few weeks), DL1 and DL2 (the 5th week of a Block: the week starting 4 Mondays after the Monday of the week Assessment B was done).
- **On hold:** E1–E3 need Sentry set up on production.

## Session

- Date:
- Device(s) and OS version:
- Build:
- Branch and commit:

## Session 5: simulators, M7

- Date: 2026-11-19
- Devices: iPhone 17 Pro simulator (iOS 26.4); Android emulator (Pixel 9, Android 17). Run by Claude.
- Build: development builds (`expo prebuild`, then Debug) with the Clerk stub (`CLERK_STUB=1`), one Metro, each simulator against its own in-memory API (`dev:local`) with `USDA_API_KEY=DEMO_KEY` and no Gemini key. iOS onboarded through the API with no Activity Level (as a pre-M7 account would be), Android through the app. Neither API had the Exercise library seeded.
- Branch and commit: ticket/158-manual-checks, off spec/158-m7-nutrition 6d4964c
- `DEMO_KEY` was over its limit all session (0 left), so search answers for "egg" came from responses saved by earlier runs, and every other search showed the Saved Foods note (F4).
- Offline on Android: the API went through a small proxy on the Mac, killed for "offline", since removing `adb reverse` leaves the app's open socket hanging. iOS offline checks weren't run.
- Found and fixed: **the iOS build crashed at launch** once `expo-camera` was in it ("Symbol not found … ExpoModulesCore", from the precompiled ExpoCamera). `expo` was 58.0.19 against SDK packages expecting 58.0.26; `npx expo install --fix` aligned them (see step 10). Android was fine before and after.

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

🕒 In the 5th week of a Block: the week starting 4 Mondays after the Monday of the week the Assessment's B was done.

- [ ] **DL1** In the deload week, open the Next Workout sheet on Today: the Exercises and Sets are as usual, weighted targets about 10% lighter (on a real dumbbell, plate or stack step), and bodyweight, band and timed targets about 70% of last week's (never under 5 reps or 15 s unless they were already). Below the plan, a "Retake the Assessment" section explains that only the Exercises it tests, and any not done this Block, get new levels, with Start assessment A. The wording reads well and doesn't feel pushy.
  - Result: · Notes:
- [ ] **DL2** Dismiss the retest with the ×: it stays gone for the rest of the week. On the Monday after, the plan is back to the usual loads and there's no retest. Or, instead, take A and B in the deload week: the Results open as usual, and next week an Exercise you trained this Block but the Assessment didn't test keeps the target it had reached.
  - Result: · Notes:

## Daily Targets (#160)

M7 checks run on the phones' Release builds against the API on the Mac.

- [x] **DT1** Today opens with four equal rings above the Today card: kcal left, g protein left, fibre and water. With nothing eaten, kcal and protein show the whole targets, fibre and water show 0 of theirs (water in L), and every ring is empty. Tapping a ring does nothing.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Four rings over the Today card: 2,410 kcal left, 128 g protein left, 0 of 96 g fibre, 0 of 2.75 L, all empty.
- [x] **DT2** On Profile, change the Goal (Edit profile), the Activity Level and the fibre target in turn. Back on Today, the rings show the new targets each time. Clearing the fibre target ("Follow calories") puts the fibre ring back to 40 g per 1,000 kcal.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Android: a 50 g fibre target made Today's fibre ring "0 of 50 g fibre". Goal, Activity Level and clearing the target not tried.
- [x] **DT3** A new account's onboarding asks "How active are you?" after the Goal, with the four levels described by job and steps, and won't go on without one. Profile then shows it under Nutrition.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Android onboarding asked "How active are you?" after the Goal (step 3 of 6), with the four levels by job and steps; Next without one stayed on the step. Profile shows "Lightly active" under Nutrition.
- [x] **DT4** An account onboarded before M7 (no Activity Level) sees "How active are you?" under the rings on Today. Picking a level saves it and the card goes, and the kcal ring changes unless lightly active was picked. On a second such account, "Not now" hides it for good, also after a force-quit, with the rings counting it as lightly active.
  - iOS: Result: ✅ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): iOS: an account onboarded through the API with no Activity Level saw the card under the Coach's summary. Picking Active hid it, and kcal went 2,410 → 2,710 (fibre 96 → 108 g). "Not now" not tried.
- [x] **DT5** Offline, Today shows no rings and nothing breaks; back online, they come back on the next visit to Today.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Android, API cut: a cold start shows Today with no rings and "No connection. Workouts save on this phone until there is."; nothing broke. Coming back to Today while the app is open keeps the last rings it had.

## Weigh-ins (#161)

Body weight is a weekly Weigh-in now, and the latest one is the weight everything reads. When the `dev` API first starts with this change, it gives every existing account a first Weigh-in from its stored weight.

- [ ] **WI1** On an account onboarded before this change, Profile's Nutrition section shows Weight as the weight it had, dated the day it onboarded, with Log weight under it, and Weigh-in Day as Monday. The Profile section has no Weight row any more, and Edit profile doesn't ask for a weight.
  - iOS: Result: ⏭ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): Not run: the simulators use fresh in-memory APIs, so there's no account from before M7 to migrate.
- [ ] **WI2** On the Weigh-in Day (set it to today's weekday on Profile if today isn't Monday), Today shows "Log this week's weight" under the rings. Set the Weigh-in Day to another day: the row goes. Set it back and log a Weigh-in from the row: the row goes and stays gone after a force-quit, and the rings show the targets for the new weight.
  - iOS: Result: ⏭ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): Not run: both accounts have this week's Weigh-in from onboarding. Android with the Weigh-in Day set to Thursday (today) shows no row, as WI5 expects.
- [x] **WI3** With Weights in set to lb, Log weight shows the latest in lb. Log 180: Profile shows 180 lb, not 179.9 or 180.1. Switch to kg: it shows 81.6 kg. Log 82 in kg, then switch back to lb: 180.8 lb.
  - iOS: Result: ✅ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): iOS: Log weight opened on 176.4 (lb); 180 saved reads "180 lb · Thu 19 Nov" (81.6466 kg stored), and the targets rose to 2,740 kcal. The kg steps not tried.
- [x] **WI4** Log weight offers Today, Yesterday and the 5 weekdays before, Today picked. Log a weight for an earlier day this week, then another for today: Profile shows only the second, dated today, and the rings follow it. Log one for a day last week (when the days offered reach into it): Profile still shows this week's.
  - iOS: Result: ⚠️ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): iOS: offers Today, Yesterday, Tuesday … Friday, Today picked. Logging on an earlier day not tried.
- [x] **WI5** A new account's onboarding asks the weight as before. Once it's done, Profile shows that weight dated today, and Today doesn't ask for this week's weight even on the Weigh-in Day.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Android onboarding asked "Weight (lb)"; Profile then read "180 lb · Thu, Nov 19", and Today asks nothing with the Weigh-in Day set to today.
- [ ] **WI6** Offline, Log weight's Save shows "Couldn't log your weight" and Profile keeps the weight it had. Back online, logging works.
  - iOS: Result: ⏭ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): Not run.

## Finding food (#162)

`apps/api/.env` needs `USDA_API_KEY` (a free key from https://fdc.nal.usda.gov/api-key-signup). Without it the API logs "USDA_API_KEY isn't set" at start and every search finds nothing.

- [x] **F1** On Food, type "egg" in Search foods: after a moment, generic foods ("Eggs, Grade A, Large, egg whole") come first, each with its kcal per 100 g, then branded ones with their brand ("Egg bagels, egg", Lender's). Names read in normal case, not capitals.
  - iOS: Result: ✅ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): iOS: "egg" listed Eggs, Grade A, Large (egg white, egg whole, egg yolk), Bagels, egg and Bread, egg, then branded ones with brands (Snickers, Galerie, Just, Albertsons). USDA's `DEMO_KEY` was over its limit all session, so the answers were ones saved from earlier runs (a 5-result page).
- [x] **F2** Generic foods have USDA's household servings now. Tap "Eggs, Grade A, Large, egg whole": it opens on its serving, "× 1 egg whole without shell · 50 g" (50.3 g, rounded on screen), with "74 kcal · 6.2 g protein · 0 g fibre". Type 2: the grams and figures double. Tap Grams: it switches to 100 g, "148 kcal · 12.4 g protein · 0 g fibre". Clear the box: "Enter how much". A generic food with several servings ("Bagels, egg") offers each, smallest to largest, as USDA lists them. Tap the food again to close it; opening another closes the first.
  - iOS: Result: ✅ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): iOS: egg whole opened on "1 egg whole without shell", "× 1 egg whole without shell · 50 g", 74 kcal · 6.2 g protein · 0 g fibre; 2 read 101 g, 149 kcal · 12.5 g. The label rounds the grams (50.3 g).
- [ ] **F3** Tap a branded food with a label serving, such as Lender's "Egg bagels, egg": it opens on its serving ("1 bagel"), showing "× 1 bagel · 81 g" and what one holds. Type 2: the grams and figures double. Tap Grams: it switches to 100 g. A branded food whose serving is in ml (JUST Egg) offers grams only.
  - iOS: Result: ⏭ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): Not run.
- [x] **F4** In airplane mode, a search says "Searching for food needs a connection." and nothing breaks; back online, searching again works. When USDA doesn't answer (`DEMO_KEY` past its hourly limit does it), a search still lists your matching Saved Foods, under "Food search isn't answering, so only your Saved Foods are listed. Try again in a minute." With the API running without `USDA_API_KEY`, a search shows "No foods match", never an error.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Android: with the API cut, a search said "Searching for food needs a connection." With USDA refusing (`DEMO_KEY` at 0), "Maple bar" and "maple" listed the Saved Food under "Food search isn't answering, so only your Saved Foods are listed. Try again in a minute." The no-key case not run.

## Logging food (#163)

Needs `USDA_API_KEY` as for F1–F4. The Food tab opens on today: the day stepper, three rings (kcal left, protein left, fibre), Search foods, Scan (SC1–SC6) and Today so far with Breakfast, Lunch, Dinner and Snacks. Water's glasses are WA1–WA5.

- [x] **FL1** On Today, tap any ring: the Food tab opens. Open Breakfast ("Nothing yet") and tap "+ Add to breakfast": the search box takes the cursor and reads "Search foods for breakfast". Search "egg", open "Eggs, Grade A, Large, egg whole", type 2 (of its serving), and Breakfast is already picked: tap "Add to breakfast". The search clears, Breakfast is open with "Eggs, Grade A, Large, egg whole, …" and its kcal, its line says "1 food · … kcal", and the header and rings take it off what's left. Back on Today, its kcal and protein rings say the same.
  - iOS: Result: ✅ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): iOS: "+ Add to breakfast" focused the search; 2 of the egg's serving with Breakfast picked added it. Breakfast read "1 food · 149 kcal" and the rings went 2,710 → 2,561 kcal, 128 → 116 g on Food and Today.
- [x] **FL2** Search a food without tapping an Add first: it opens with no meal picked and the button reads "Choose a meal" until one is. Log two foods into Lunch: Lunch says "2 foods" and the sum of their kcal.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Android: a food from search had no meal and "Choose a meal". iOS: Breakfast read "2 foods · 288 kcal".
- [x] **FL3** Tap a logged food: it opens on the portion it was logged with. Change the amount (the figures follow as you type), pick Dinner and Save: it leaves Breakfast, Dinner opens with it, and the totals and rings change to the new portion. Tap it again, Delete, confirm: it's gone and the totals drop. Cancel on the confirmation leaves it.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): iOS: the tuna opened on its 100 g, 200 g read 232 kcal as typed, Dinner + Save moved it and the rings followed. Android: Delete asked "Delete this food?"; Cancel kept it, Delete removed it and the totals dropped.
- [x] **FL4** Step back with ‹: "Yesterday", then "2 days ago" down to "6 days ago", where ‹ greys out; › greys out on Today. Each day shows its own meals and rings. Log a food on "3 days ago": it shows there and not on Today. Step back to Today: Today's meals are as you left them.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Android: ‹ seven times stops at "6 days ago" with ‹ disabled.
- [ ] **FL5** With your phone's timezone moved to one where it's already tomorrow (or late in the evening, before midnight), "Today" on the Food tab is today where the phone says, and a food logged then counts for that day.
  - iOS: Result: ⏭ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): Not run.
- [x] **FL6** In airplane mode, open the Food tab (or step to another day): it says "Logging food needs a connection. Nothing is saved on this phone until you have one." With a day already showing, change a portion and Save, or Add a food: a toast says logging needs a connection and nothing was saved, and what you chose stays open to try again. Back online, Save or Add again: it's logged once, with nothing doubled.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Android, API cut: Save on a changed portion toasted "Logging food needs a connection. Nothing was saved: try again when you have one." and the editor stayed open. Back online the day had the one entry, nothing doubled. Cut the emulator with a proxy that can be killed: removing `adb reverse` leaves the app's open socket hanging (no request timeout), so writes then wait for ever.

## Scan, Create food and Saved Foods (#164)

Needs a build made after `npx expo prebuild` (step 10), since the camera is new native code. The iOS Simulator has no camera. Barcodes are looked up in the user's Saved Foods, then Open Food Facts (no key), then USDA's branded foods (`USDA_API_KEY`). On the web build Scan isn't there at all.

- [x] **SC1** On Food, Scan sits beside Search foods. Tap it: the phone asks to use the camera, saying it's for scanning the barcodes on food you log. Allow it: the camera opens full screen with "Point the camera at the barcode on the package" and Cancel. Cancel closes it. Deny instead (on a fresh install): a toast says scanning needs the camera, and search still works.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Android: Scan asked for the camera (Android's own wording; the purpose text is iOS only). Don't allow toasted "Scanning needs the camera. Allow it in Settings, or search instead."; allowing opened the camera full screen with "Point the camera at the barcode on the package" and Cancel, which closed it. iOS Simulator has no camera.
- [ ] **SC2** Scan a Canadian product from the cupboard (for example Kraft Smooth Peanut Butter, 0068100084245): the camera closes after one read, and "Scanned" shows the product with its brand and kcal per 100 g, opened on its label serving ("1 tbsp", 15 g). Pick a meal and add it: it's logged, as FL1.
  - iOS: Result: ⏭ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): Not run: no barcode in front of a simulator camera.
- [x] **SC3** Scan a product Open Food Facts doesn't have (a store's own brand, or something small-batch): Create food opens, saying nothing has the barcode yet. Fill in the name, the serving ("1 bar", 45) and the label's kcal, protein, carbs and fat, leaving fibre empty, and tap Create food: it shows as "From your Saved Foods", opened on its serving with the figures you typed and 0 g fibre. Add it to a meal. An empty name or grams says what to fix, and keeps what you typed. From search instead: search for something nothing matches and tap "Create food from its label" under the results: Create food opens with the words searched as its name.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Android, from search: "Create food from its label" under "Maple bar" opened Create food named "Maple bar" (review S5). 1 bar, 45 g, 200 kcal, 4/30/8 g saved, showed as "Saved food · 444 kcal per 100 g" on 1 bar and logged to Snacks. The scan path not run.
- [x] **SC4** Scan the same product again: it's found straight away as your Saved Food, without Create food. Search its name (any word of it, in any case): it comes first, marked "Saved food", above the USDA results.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Android: "maple" found it first, marked "Saved food". USDA was refusing, so it wasn't shown above USDA results. Scanning not run.
- [x] **SC5** Open the Saved Food from search, tap "Edit saved food", change its kcal and Save: the food shows the new figures, and logging it again uses them. The entry you logged in SC3 still shows the old kcal on its day. Edit it again and "Delete from Saved Foods": it's gone from search, scanning it offers Create food again, and the logged entry is still there.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Android: Edit saved food, 250 kcal, Save: search reads 556 kcal per 100 g, and the logged entry kept 444 per 100 g. Delete from Saved Foods not tried.
- [ ] **SC6** In airplane mode, scan a barcode: a toast says finding food needs a connection, and nothing else happens. Create food's Save offline says the same and keeps the form open. Back online, both work.
  - iOS: Result: ⏭ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): Not run: needs a barcode.

## Copy from yesterday and Recent (#165)

The Food tab has a two-part control at the top: _Today so far_ (the day, as FL1–FL6) and _Ideas and recent_: the Coach's summary and Food Ideas (FI1–FI6), then Recent and Saved Foods.

- [x] **CR1** The Food tab opens on "Today so far", highlighted in the two-part control. Tap "Ideas and recent": the day stepper, rings, glasses and meals give way to the Coach's summary, Food Ideas and "RECENT AND SAVED". Tap "Today so far": they're back as you left them.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Ideas and recent shows the Coach's summary, two Food Ideas, the Diet chip, then RECENT AND SAVED; Today so far comes back as left.
- [x] **CR2** With yesterday's Breakfast logged (two foods, say) and one food already in today's: open today's Breakfast and tap "Copy from yesterday". Yesterday's foods appear after the one already there, nothing is replaced, and the line, header and rings add them. Change the portion of one copy and Save, then step back to "Yesterday": its Breakfast is as it was.
  - iOS: Result: ✅ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): iOS: yesterday's 2 foods (seeded through the API) were added after today's 2 (4 foods · 552 kcal). Moving a copy left Yesterday at 2 foods · 264 kcal. A retried add with the same request id answered 200 and added nothing (through the API).
- [x] **CR3** Open a meal that had nothing yesterday and tap "Copy from yesterday": a toast says nothing was logged in it the day before, and nothing is added. Step back to "Yesterday": the button reads "Copy from the day before" and copies from 2 days ago into yesterday.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): "Nothing was logged in dinner the day before." on iOS, "… in snacks …" on Android. Yesterday's button reads "Copy from the day before".
- [x] **CR4** On "Ideas and recent", your Saved Foods come first, starred, then the foods you've logged, most recent first, each once (a food logged twice, or copied, shows once). Tap one: it opens to choose a portion and a meal, as a search result does; tap it again to close it. Pick Snacks and "Add to snacks": the tab goes back to Today so far with Snacks open and the food in it, and that food is now first in Recent.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): iOS: the egg showed in Recent after logging it. Android: the Saved Food first and once, though also logged, then Tuna in water.
- [x] **CR5** Edit a Saved Food's kcal (from search, SC5), then open it from "Ideas and recent": it shows the new figures, and it's listed once. On a fresh account with nothing logged or saved, "Ideas and recent" says the foods you log and save show there.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Android: after SC5's edit the Saved Food is listed once on Ideas and recent. The fresh-account wording not checked.
- [x] **CR6** In airplane mode, tap "Copy from yesterday": a toast says logging food needs a connection and nothing is copied. Open "Ideas and recent" with nothing loaded yet: it says recent and saved foods need a connection. Back online, both work, and Copy from yesterday adds yesterday's foods once.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Android, API cut: Copy from yesterday toasted that logging food needs a connection and nothing was copied. Ideas and recent with nothing loaded not tried.

## Water (#166)

Water is logged on the Food tab, in 250 ml glasses, and only shown on Today.

- [x] **WA1** On the Food tab, under the three rings, "Water · 0 of 2.75 L · tap a glass" (your target in L) sits over a row of empty glasses, one per 250 ml of the target (11 for 2.75 L). Tap any empty glass: one more glass fills from the left and the line reads "0.25 of 2.75 L". Tap empty glasses three times quickly: three more fill, and after leaving the tab and coming back it still shows 1 L.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): 11 empty glasses under "Water · 0 of 2.75 L · tap a glass". iOS: four quick taps filled four from the left, 1 L, still 1000 ml in the API after leaving the tab.
- [x] **WA2** Tap any filled glass: one glass empties and the line drops by 0.25 L. Tap filled glasses until none is left: it reads "0 of …" and stays there after leaving the tab and coming back.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Android: 0.5 → 0.25 → 0 L tapping filled glasses.
- [x] **WA3** Step back to "Yesterday" and fill two glasses: yesterday shows 0.5 L, and stepping back to Today shows today's water as you left it.
  - iOS: Result: ✅ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): iOS: two glasses on Yesterday saved 500 ml there; today kept 1 L.
- [x] **WA4** With some water logged, Today's water ring shows it ("1" of "2.75 L", a third full). Tap the water ring: the Food tab opens and the water hasn't changed, on Today or the Food tab.
  - iOS: Result: ✅ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): iOS: Today's water ring "1 of 2.75 L", a third full.
- [x] **WA5** In airplane mode, with the Food tab already showing, tap a glass: it fills, then a toast says logging water needs a connection and the glasses go back to what was saved. Back online, tapping works.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Android, API cut: the glass filled, then "Logging water needs a connection. Nothing was saved: try again when you have one." and it went back to 0.

## Diet, Food Ideas and the Coach's summary (#167)

The Coach's summary sits under Today's rings and at the top of the Food tab's Ideas half. Its Food Ideas come from a list of about 40 high-protein foods, filtered by your Diet; search and Scan never are.

- [x] **FI1** On Today, with some food logged but the targets not met, a card under the rings reads like "1,036 kcal and 54 g of protein left." with a line under it such as "Cottage cheese and tofu at dinner would cover all of the protein." The numbers match the kcal and protein rings, the meal is the one for the time of day (breakfast before 11:00, lunch before 16:00, dinner before 21:00, then "as a snack"), and nothing mentions fibre or water. On a Weigh-in Day without this week's Weigh-in, the "Log this week's weight" row sits under the card.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): "2,561 kcal and 116 g of protein left." / "Shrimp and tuna in water at breakfast would cover 55 g of the protein." before 11:00, matching the rings; no fibre or water.
- [x] **FI2** Tap the card: the Food tab opens on Ideas and recent, with the same summary and two Food Ideas under it, each with its portion, kcal and protein ("1 cup · 163 kcal · 28 g protein") and a button named for the meal ("+ Dinner"). Neither idea has more kcal than are left.
  - iOS: Result: ✅ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): iOS: Shrimp "1 portion, cooked · 99 kcal · 24 g protein" and Tuna in water "1 can, drained · 139 kcal · 31 g protein", each "+ Breakfast".
- [x] **FI3** Tap an idea's button: the Food tab switches to Today so far with that meal open, holding the idea at its portion ("Cottage cheese, 1 cup"). Today's kcal and protein rings drop by the idea's kcal and protein, and the summary follows.
  - iOS: Result: ✅ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): iOS: + Breakfast on the tuna opened Breakfast with "Tuna in water, 1 can, drained", rings 2,561 → 2,422 kcal, 116 → 85 g.
- [x] **FI4** On the Ideas half, tap "Diet: Any ✎", choose Vegan, tick Nuts and Save: the chip reads "Diet: Vegan, no nuts ✎" and the ideas change straight away to vegan ones with no nuts (tofu, seitan, a pea protein shake, lentils and so on). In Profile, under Nutrition, the Diet row reads "Vegan, no nuts". Change it there to Vegetarian with Dairy ticked: the Ideas half offers no dairy (no cottage cheese, yogurt or whey). Search for "cheese": cheeses still come up, as search ignores the Diet.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Android: Vegan with Nuts ticked: chip "Diet: Vegan, no nuts ✎", ideas Seitan and Pea protein shake. Profile's Diet row and the Vegetarian/Dairy step not tried.
- [x] **FI5** Log enough protein to meet the protein target: the summary reads "Protein target met, with … kcal left." and the Ideas half offers no ideas. Log enough to pass the kcal target too: it reads "Calorie and protein targets met." and both rings show 0 left.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Android: "Protein target met, with 1,651 kcal left." and no ideas; past the kcal target too, "Calorie and protein targets met." with both rings at 0.
- [x] **FI6** Before 11:00, the idea buttons read "+ Breakfast", and a Recent or Saved Food chosen on the Ideas half has Breakfast picked for it. After 21:00 they read "+ Snacks".
  - iOS: Result: ⚠️ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): iOS: before 11:00 the buttons read "+ Breakfast". After 21:00 not tried.

## Tell the coach (#168)

Needs `GEMINI_API_KEY` in `apps/api/.env` (a free key from https://aistudio.google.com/apikey). The real sentences go to Gemini Flash, so these are the only checks of its answers: the route tests use a fake, and the mapping test a response built from Gemini's documented format, as no key was to hand when it was written. It asks `gemini-flash-latest` unless `GEMINI_MODEL` names another; if Tell the coach fails, the API's log gives Gemini's reason ("Gemini answered 404: …").

- [ ] **TC1** On Today, under the Coach's summary (and the Weigh-in row on a Weigh-in Day), "Tell the coach" has a box reading "Yesterday I had two eggs and toast". Type "yesterday I had two eggs and toast" and tap Tell (or Send on the keyboard): after a moment a sheet asks "Is this right?" with an egg and a toast, each "Yesterday · Breakfast", with a slider and a line such as "2 × 1 large egg · 100 g · 155 kcal · …". The numbers look about right for eggs and toast. Nothing is logged yet: Cancel, and the Food tab's Yesterday has no new foods.
  - iOS: Result: ⏭ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): Not run: no `GEMINI_API_KEY`.
- [ ] **TC2** Tell it the same again. Slide the eggs to 3: the line follows (150 g and its kcal). Slide the toast down. Tap ✕ on one food: it leaves the list and the button says "Log 1 food". Tap it: a toast says "Logged 1 food", the box clears, and on Food, Yesterday's Breakfast has that food at the portion you slid to, and Today has nothing new.
  - iOS: Result: ⏭ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): Not run: no `GEMINI_API_KEY`.
- [ ] **TC3** Type a real sentence about today, such as "a chicken salad for lunch and a latte": each food is "Today · Lunch" (the latte may be Snacks) with a sensible portion. Log them: Today's kcal and protein rings drop by their kcal and protein, and they're in Lunch on Food.
  - iOS: Result: ⏭ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): Not run: no `GEMINI_API_KEY`.
- [ ] **TC4** Type something with no food in it ("went for a walk"): the sheet says "No food found" and OK closes it, logging nothing. In airplane mode, Tell says telling the Coach needs a connection, and the words stay in the box.
  - iOS: Result: ⏭ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): Not run: no `GEMINI_API_KEY`.
- [x] **TC5** With the API running without `GEMINI_API_KEY`, Today has no "Tell the coach" box and nothing else on Today or Food changes. The API logs "GEMINI_API_KEY isn't set: Tell the coach is hidden" at start.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): No key: no Tell the coach box on Today, and the API logged "GEMINI_API_KEY isn't set: Tell the coach is hidden".

## Tabs and the Exercise library (#159)

The Exercises tab is gone: the Exercise library is Profile's first row, so Food fits without five tabs.

- [x] **TB1** On the iPhone and on Android, the tab bar shows Today, Food, History and Profile, in that order (Food since #162), each label whole (no clipped descenders), and nothing else. The current tab is in the accent colour.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Session 5 (simulators, M7): Today, Food, History, Profile, labels whole, the current tab in the accent colour.

- [x] **TB2** On Profile, the first row is "Exercise library" with a chevron. Tapping it opens the library titled "Exercise library", with Profile still the current tab. Tap an Exercise: its detail opens. Back (the header's arrow, and on the iPhone a swipe from the left edge; on Android the system back) returns to the library, and again to Profile.
  - iOS: Result: ⏭ · Android: Result: ⚠️ · Notes: Session 5 (simulators, M7): Android: Profile's first row "Exercise library" opens the library so titled, with Profile current, and system back returns. The in-memory API had no Exercises seeded ("0 of 0 Exercises"), so the detail steps weren't run.

- [ ] **TB3** On an Exercise's detail with Easier or Harder, tap it: that Exercise's detail opens over it, and back returns to the first. With a Workout in progress, the Resume pill shows on the library and on the detail, and pressing it reopens the Workout.
  - iOS: Result: ⏭ · Android: Result: ⏭ · Notes: Session 5 (simulators, M7): Not run: no Exercises seeded.

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
