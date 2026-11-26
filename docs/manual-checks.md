# Manual checks on the phone

Checks still to run on a phone. Everything else has passed and been removed; `git log -p docs/manual-checks.md` has the past results.

For each check, tick the box and fill in the result. Leave **Notes** empty when it passes cleanly; write what you saw when it doesn't, or when something felt off even if it technically passed.

Result codes: **✅ pass** · **❌ fail** · **⚠️ works but feels off** · **⏭ skipped / couldn't test** · **🕒 skip for now: needs time to pass**

## What's left

- **Run on the phone now:** R1, U1, U2, LS2, PR1, RS1–RS7. Each is a part no run has covered yet.
- **M7, on the phones:** WI4, WI6, F4, FL6, SC3, SC4, TC4, FI6, TB2, NA1. Session 5 passed the rest of M7 on the simulators and phones; these are the parts not yet seen, and the offline checks again after #170–#174.
- **Ranges (#189), on the phones:** RR1–RR3.
- **Nutrition History (#191), on the phones:** NH1–NH4.
- **Saved Meals (#192–#194), on the phones:** SM1–SM3.
- **Mobility and the hold timer (#195), on the phones:** HT1–HT6, GF1–GF10, R2–R5, RX1.
- **🕒 Week Summary card (#210), on a Sunday evening with both phones:** WC1–WC4.
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

## Rest screen (#179)

On the installed web app on the iPhone, with the silent switch off and the volume up.

- [x] **RS1** Log a Set and put the phone down a few steps away: the countdown reads from across the room, in light and dark, and shows the next Set and its target.
  - Result: · Notes: Pass
- [x] **RS2** Keep music playing in another app and rest to the end: it beeps at 3, 2, 1 and 0, loud enough to notice, and the music carries on.
  - Result: Pass · Notes
- [x] **RS3** The phone vibrates at 3, 2, 1 and 0 where it can (Android; Safari on the iPhone can't). Where it can't, the rest works the same otherwise.
  - Result: PAss· Notes:
- [x] **RS4** At 0 the screen flashes twice and the logging screen is back, with the next Set's steppers ready. With Reduce Motion on (Settings → Accessibility → Motion), there's no flash.
  - Result: PAss· Notes: Flashing twice doesn't look good, just falsh once. No flash on mobility
- [x] **RS5** Turn Sound off during a rest: the rest ends silently. Close and reopen the app: the next rest still has it off. Turn it on mid-rest: it beeps again.
  - Result: Pass· Notes:
- [x] **RS6** Lock the phone, or switch apps, for part of a rest: on return the time left is right. Stay away past its end: it's closed, with no beep, vibration or flash. The next rest still beeps.
  - Result: Pass · Notes:
- [ ] **RS7** With VoiceOver, the countdown reads as "Rest, 1:05 left", and the buttons behind the rest screen can't be reached.
  - Result: · Notes:

- [x] **RS8** Log an Exercise's last planned Set: the rest screen has the rating, Next exercise and Log extra set, all in sight without scrolling. Next exercise opens the next Exercise with the rest as a bar (#180).
  - Result: Pass· Notes:

## Hold timer (#196)

On the installed web app on the iPhone, with the silent switch off and the volume up.

- [x] **HT1** On a planned plank, tap Start timer: 5 s to get into position, then a countdown to the bottom of the range and up past it, readable from a plank on the floor, in light and dark.
  - Result: Pass · Notes:
- [x] **HT2** It beeps and flashes (and vibrates on Android) at the bottom and again at the top of the range; once for a single number (a deload week, or 60 s). Music in another app carries on. With Sound off, it's silent.
  - Result: Pass · Notes:
- [x] **HT3** Stop fills in the seconds and logs nothing; they can be corrected before Log set, and the next Set starts from what was logged, then rests as usual. Cancel, in the 5 s or during the hold, leaves the seconds as they were. Starting during a rest ends the rest.
  - Result: PAss · Notes:
- [x] **HT4** In an Assessment it counts up from 0 after the 5 s, with no sound, vibration or flash. The walk, mobility Exercises and carries have no Start timer.
  - Result: Pass · Notes:
- [x] **HT5** Lock the phone, or switch apps, for part of a hold: on return the seconds are right, with no late beep. Left alone, the screen stays awake.
  - Result: Pass · Notes:
- [x] **HT6** With VoiceOver, the clock reads as "Hold, 0:12 left", each change (Hold, Target reached, Top of the range) is announced, and the buttons behind can't be reached. With Reduce Motion on there's no flash.
  - Result: PAss · Notes:

## Guided flow (#200)

On the installed web app on the iPhone, with the silent switch off and the volume up.

- [x] **GF1** Start a Mobility Workout: the flow opens by itself with 10 s to change position, and shows the hold's name, cues, what's next and how far through, readable from the floor. A one-sided hold says "Switch sides", with 10 s between.
  - Result: Pass · Notes:
- [x] **GF2** It beeps (and vibrates on Android) at the start, in the last 3 s and at the end of each side, and nothing but vibration with Sound off. Music in another app carries on. It goes on by itself, with no rest and no RPE.
  - Result: Pass · Notes: It flashes twice in mobility, no flash should happen at all
- [x] **GF3** Pause and Resume keep the time. Skip logs nothing. Lock the phone, or switch apps, mid-hold for a minute: it's paused where it was and nothing is logged. Left alone, the screen stays awake.
  - Result: Pass · Notes:
- [x] **GF4** Walk and mobility: the walk is logged in minutes as before, then the flow opens.
  - Result: Pass · Notes:
- [x] **GF5** After the last hold, the flow offers Back, which repeats it, and Finish, which shows the time taken and the holds done (a hold of two Sets once), and saves. Finish early keeps what's logged; with nothing logged, Save offers to discard.
  - Result: Pass· Notes:
- [x] **GF6** With VoiceOver, the clock reads as "Hold, 0:12 left", each change is announced with the next hold's name, and the buttons behind can't be reached. With Reduce Motion on there's no flash.
  - Result: Pass · Notes:
- [x] **GF7** Back repeats the previous hold, and when it ends there's still one Set for it; leaving before then keeps the old one. Back to a skipped hold logs it. Both go on to the first hold left.
  - Result: Pass · Notes:
- [x] **GF8** Mid-flow, force-quit the app and reopen it: Resume workout opens the flow, paused at the first hold not logged, and Resume sounds as before.
  - Result: Pass · Notes:
- [x] **GF9** Leave timer, log or delete a hold's Set, then Continue holds: it starts at the first hold left, and doesn't go back over the skipped ones.
  - Result: Pass · Notes:
- [x] **GF10** Add a Recovery Exercise (not the walk) to a Manual Workout: Start timer runs both sides and logs its Set with no rest, then returns to the logging screen. The walk has no timer.
  - Result: Pass · Notes:

## Supersets (#96)

A Workout pairs Exercises only when it wouldn't otherwise fit its Length. Pairs form where the Patterns go together (push with pull or hinge, squat with core), never with a one-sided Exercise or a carry. On the simulators, Bodyweight only on Short paired them. The sheet then says "Paired into supersets to fit the time" and shows "Superset with …" under each paired Exercise.

- [ ] **S1** P9's timing check on a paired Workout: start one whose sheet shows at least one superset, note its "About N min", and run it in full with a timer, resting as the timer says and skipping nothing. A pair is timed at Sets × (the longer Exercise's Set + 30 s): does the real time come out within a few minutes of the estimate?
  - Result: · Notes:

## Daily check-in (#92)

- [ ] **C5** 🕒 The next day the check-in is gone: the card is back (if there's a plan) and the Workout is full.
  - Result: · Notes:

## Recovery Workout (#97)

- [x] **R1** On a real Rest Day, Today shows the "Rest today." card with a "Mobility" link and a "Walk and mobility" link under it. "Walk and mobility" opens the Recovery Workout (a 20-minute walk, then four stretches). The Workout itself has passed from a training day's sheet; only the card hasn't been seen.
  - Result: Pass· Notes:

- [x] **R2** Mobility, from Today and from the plan's sheet: 20 min and Full body are chosen at first; changing either changes the list, and each hold's time and the total show. Start opens a Workout of those holds, and afterwards the same plan is on offer. Opened again, the length and focus are as last chosen and the holds mostly differ.
  - Result: Pass· Notes:
- [x] **R3** The day after hard leg training, Mobility starts with holds for the legs. In airplane mode, after closing the app, it still opens and starts.
  - Result: Pass · Notes:
- [x] **R4** History shows "Mobility · N min" (the time it took) and "Walk and mobility", and neither counts in This Week.
  - Result: Pass · Notes:
- [x] **R5** Before starting Mobility (#199): Swap opens similar holds under the row, and picking one changes the list and the total; Remove takes a hold out; the last hold has no Remove; a hold with nothing to swap to says so. Start opens the changed list.
  - Result: Pass · Notes:
- [x] **RX1** The new Recovery Exercises (#197) are in the library with the other Recovery Exercises, each with a page of cues. With an injury set, Walk and mobility swaps a hold it rules out for another. Without a foam roller in the Equipment Profile, no roller hold is offered. Run after `pnpm seed:exercises` on production.
  - Result: Pass · Notes:

## Units (#126, #148)

- [x] **U1** On a home Equipment Profile with dumbbells but no weights entered, the load stepper moves by 5 lb, or 2 kg once kg is picked.
  - Result: Pass · Notes:
- [x] **U2** A new account's onboarding asks "Weight (lb)". After saving 180 lb in Edit profile, picking kg reads 81.6 kg on Profile, and Edit profile asks "Weight (kg)".
  - Result: PAss · Notes:

## Load Steps (#127)

- [ ] **LS2** On a home Equipment Profile with a cable machine selected, the weights stage shows "Cable and machine step (lb)" next to the other equipment, and the step saved there moves the cable targets and stepper.
  - Result: · Notes:

## Bar-and-plates dumbbells (#181)

- [x] **BP1** In Edit profile, at home with dumbbells, choose **Bar and plates** and enter a 4 lb bar × 2, 3 lb × 4 and 5 lb × 4, adding and removing a row on the way. Profile's Equipment reads "Dumbbells (2 × 4 lb bars, 4 × 3 lb and 4 × 5 lb plates)", editing again shows it back, and a goblet squat's stepper goes 12, 13, 14.
  - Result: Pass · Notes:

## PRs (#130)

- [x] **PR1** Beat an Exercise's best with signal and Save workout. While the "Workout saved. New PR: …" toast is up (about 10 s), tap **See workout**: it opens the Workout in History with "New PR · …" under that Exercise.
  - Result: Pass · Notes:

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

- [x] **WI4** Log a Weigh-in for an earlier day this week, then another for today: Profile shows only the second, dated today, and the rings follow it. Log one for a day last week (when the days offered reach into it): Profile still shows this week's.
  - iOS: Result: · Android: Result: · Notes:
- [x] **WI6** Offline, Log weight's Save shows "Couldn't log your weight" and Profile keeps the weight it had. Back online, logging works. Cancel, and on the iPhone a swipe down, close the sheet at any time, even while Save is loading (#172).
  - iOS: Result: · Android: Result: · Notes:
- [x] **F4** In airplane mode, a search says "Searching for food needs a connection." and nothing breaks; back online, searching again works.
  - iOS: Result: · Android: Result: · Notes:
- [x] **FL6** In airplane mode, open the Food tab (or step to another day): it says logging food needs a connection. With a day already showing, change a portion and Save, or Add a food: a toast says logging needs a connection and nothing was saved, and what you chose stays open to try again. Back online, Save or Add again: it's logged once, with nothing doubled.
  - iOS: Result: · Android: Result: · Notes:
- [x] **SC3** Scan a product Open Food Facts doesn't have (a store's own brand, or something small-batch): Create food opens, saying nothing has the barcode yet. Fill in the name, the serving ("1 bar", 45) and the label's kcal, protein, carbs and fat, leaving fibre empty, and tap Create food: it shows as "From your Saved Foods", opened on its serving with the figures you typed and 0 g fibre. Add it to a meal.
  - iOS: Result: · Android: Result: · Notes:
- [x] **SC4** Scan the same product again: it's found straight away as your Saved Food, without Create food. Search its name: it comes first, marked "Saved food", above the USDA results.
  - iOS: Result: · Android: Result: · Notes:
- [x] **SM1** On the Ideas half, tap "New saved meal", name it and set 2 servings. Scan a packaged food, choose a portion and Add ingredient; scan one nothing has, make it with Create food, and add that too. kcal and protein per serving show and follow each change, and a saved meal is never offered as an ingredient. Save: it opens to log, with servings and no Grams. Add 0.5: the day has one food with its name, and tapping it shows the ingredients at that portion. On Android, the system back leaves the editor for the Food tab. In airplane mode, Save says saving needs a connection and everything stays as typed (#192).
  - iOS: Result: · Android: Result: · Notes:
- [x] **SM2** On a past day, open a meal holding a food and a Saved Meal and tap "Save as meal": New saved meal opens with the food and the Saved Meal's own ingredients, at the portions logged. Change one, remove another, name it, set the servings and Save: the same day shows again, its meal unchanged, and the new Saved Meal is found by search. A meal with nothing logged doesn't offer it (#193).
  - iOS: Result: · Android: Result: · Notes:
- [x] **SM3** Edit a Saved Meal to give it a cooked weight: logging it now offers Grams beside servings. Log 350 g: the day has that share of it, and the Food Entry opens to its ingredients at 350 g. Change the entry to 1 serving and back to grams. Clear the cooked weight: only servings are offered, and the day logged stays as it was. A weight over 100,000 g is refused, saying so (#194).
  - iOS: Result: · Android: Result: · Notes:
- [x] **TC4** In airplane mode, Tell says telling the Coach needs a connection, stops loading at once, and the words stay in the box (#173). Back online, Tell works.
  - iOS: Result: · Android: Result: · Notes:
- [x] **FI6** After 21:00, the idea buttons read "+ Snacks", and a Recent or Saved Food chosen on the Ideas half has Snacks picked for it.
  - iOS: Result: · Android: Result: · Notes:
- [x] **TB2** From Profile's "Exercise library", tap an Exercise: its detail opens. Back (the header's arrow, and on the iPhone a swipe from the left edge; on Android the system back) returns to the library, and again to Profile.
  - iOS: Result: · Android: Result: · Notes:

## Ranges and rings (#189)

- [x] **RR1** On the Food tab, log food until kcal and protein pass through each state, in light and in dark: below, the ring is orange with what's left to the bottom of its range; in range, full and green with the amount and "in range"; over, a red second lap you can tell from the green under it, with how far over. Today's rings show the same, and the Coach's summary agrees with both.
  - iOS: Result: · Android: Result: · Notes:
- [x] **RR2** Log far too much (over twice a target): the red lap is full and goes no further. Fibre, water and the Workout rings stay orange.
  - iOS: Result: · Android: Result: · Notes:
- [x] **RR3** With VoiceOver or TalkBack on, each kcal and protein ring says its state in words: left to be in range, in range, or over the range.
  - iOS: Result: · Android: Result: · Notes:

## Nutrition History (#191)

- [x] **NH1** Tap the Food tab's kcal ring, then go back and tap protein: Nutrition History opens on each. Today's rings still open the Food tab itself. Back (the header's arrow, the iPhone's swipe, Android's system back) returns to the day.
  - iOS: Result: · Android: Result: · Notes:
- [x] **NH2** In light and in dark, this week and one with days below, in range and over: the bars are orange, green and red as those days' rings are, the band and the dotted average are clear behind and over them, and no number overlaps another. Change your Goal: from today the band steps, and the days before keep theirs. Days with nothing logged (or only water) are empty slots, and the average leaves them and today out.
  - iOS: Result: · Android: Result: · Notes:
- [x] **NH3** The arrows go back to the week of your first Food Entry and stop, and forward no later than this week. Tap each bar and an empty slot: its amount, range and state show below. Leave this week open in the background overnight and come back: today has moved on, and after a Sunday it's the new week, with the old one an arrow back.
  - iOS: Result: · Android: Result: · Notes:
- [x] **NH4** With VoiceOver or TalkBack on, each day says its name, amount, range and state, or that nothing is logged. In airplane mode, opening it says it needs a connection; back online, Try again loads it.
  - iOS: Result: · Android: Result: · Notes:

## Day Summary: the receipt (#208)

From 6 to 10 pm in your timezone. Change the phone's time in Settings (turn off automatic time) to reach the edges.

- [ ] **DS1** At 5:59 pm Today is as before. Leave the app open and go to 6:00 pm, then bring it back to the front: a "TODAY" receipt sits under the Coach's Nudge, and the rest of Today is unchanged. At 10:00 pm, back to the front again, it's gone.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **DS2** With nothing done and no Rest Day, the receipt says "○ No workout yet" and "○ No food logged". Log some food: on coming back to Today, Calories and Protein show against their targets, "○" while short, ✅ in range, and red with how far over once over, agreeing with the rings.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **DS3** Finish a Workout: the row names it by up to three Muscles with its Sets and time ("✅ Quads, glutes and chest · 10 Sets · 48 min"). Finish a second: they merge into one row. A Mobility Workout alone reads "✅ Mobility · 20 min", and a kept Rest Day "✅ Rest Day". Long names wrap; the numbers stay on one line.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **DS4** The line at the receipt's foot gives tomorrow: rest or the Workout's Muscles, a reason, and tomorrow's kcal and protein. With no Planned Workout (before the Assessment) or a stale one, it's left out.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **DS5** In airplane mode, after Today has loaded the day once, the receipt still shows, with a Workout finished offline counted. Open the app fresh in airplane mode: no receipt. In light and dark, the receipt reads clearly.
  - iOS: Result: · Android: Result: · Notes:

## Day Summary: the finished day (#209)

From 6 to 10 pm in your timezone, as for #208. The day is finished once you've trained (Mobility and Walk and mobility included) or kept a recommended Rest Day, and kcal is in range or over. Protein never decides it.

- [ ] **DF1** Train, and log food short of the kcal range: Today is as in DS1, with the Nudge, "Done for today." and the links. Log enough food to reach the range and come back to Today: a big "TOMORROW · <day>" card now leads under the rings, with "Rest." or tomorrow's Workout's Muscles, the reason, "Eat … kcal · … g protein" and "See the next Workout ›", and the "TODAY" receipt under it with no tomorrow line. The Coach's Nudge, the Workout card, "Rest between Sets", Mobility and Walk and mobility are gone; Tell the coach, This week, "Start manual workout" and Last workout stay where they were.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **DF2** On a recommended Rest Day with nothing done, reach the kcal range: the day finishes the same way, with "✅ Rest Day" in the receipt and "Rest today." gone. With kcal in range and protein short, it's still finished; with kcal over, too.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **DF3** Tap "See the next Workout ›": the Planned Workout sheet opens on the next Workout's Exercises, as from the Workout card. Close it: Today is as it was.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **DF4** With no Planned Workout or a stale one (a Workout finished in airplane mode), a finished day shows the receipt alone in the Nudge's place, with no Tomorrow card. Start a Workout on a finished day: "Keep going." still shows. At 10 pm, back to the front, Today is as it was before 6 pm. In light and dark, the card and receipt read clearly and a three-Muscle name wraps without overlapping.
  - iOS: Result: · Android: Result: · Notes:

## Weekly Streak (#207)

Needs an account onboarded at least two weeks ago, with History behind it.

- [x] **WS1** In light and in dark, This week shows "🔥 N-week streak" under the day circles, where N is the weeks in a row since your first whole week (the week you onboarded counts when you onboarded on its Monday) with at least one fewer Workout than your days per week, Mobility and Walk and mobility included. This week adds to it only once it reaches the number; on a Monday with nothing done yet the streak is still there. With no streak, nothing shows, not "0-week streak". Both phones show the same N.
  - iOS: Result: · Android: Result: · Notes:
- [x] **WS2** Finish the Workout that brings this week to the number: once Today is back, N goes up by one. In airplane mode the streak is gone (only Pending Workouts are known), and back online it returns. Change your days per week in Profile: past weeks are judged again with the new number.
  - iOS: Result: · Android: Result: · Notes:

## Week Summary card (#210)

Needs a Sunday evening, both phones signed in to the same account, and the iPhone and the Android phone both closed beforehand. While building, `DEV_NOW=<ISO time> pnpm --filter @fit/mobile web:signed-in` starts the API's clock there, and Playwright's `page.clock.install` does the browser's (docs/agents/workouts.md, "Running things").

- [ ] **WC1** Before 6 pm on Sunday, open the app: Today has no Week Summary card. Send it to the background and bring it back after 6 pm: the card is on Today, under the rings and above every other card (above the Tomorrow card when there is one). In light and in dark it shows a ring of Workouts done against planned, "Last week", the week's dates and "🔥 N-week streak" (left out with no streak), then bars for Workouts, Calories, Protein and Weekly Budget. A week with no food logged has no Calories or Protein bar, and one with no Workouts no Weekly Budget bar. In your first, part week it reads "Your first week", with fewer Workouts planned.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **WC2** With the card up, go to Food and History and back to Today: it's still there. Send the app to the background and bring it back: it's gone, and it doesn't come back however often the app is opened that week.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **WC3** Across both phones: after WC1 on the iPhone, open the app on the Android phone (after 6 pm on Sunday, or any day that week): no card. Next Sunday, do it the other way round, Android first.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **WC4** In airplane mode on a Sunday after 6 pm (or later in the week, before the card has been seen), open the app: no card. Turn airplane mode off and bring the app back to the front: the card shows, so the offline open didn't count as seen. If you opened it on Monday instead, the card is still the week just ended.
  - iOS: Result: · Android: Result: · Notes:

## Week Summary screen and Last week (#211)

Needs a week with Workouts, food, a Weigh-in and Check-ins, and for WS4 the deload week (the 5th week of the Block, counted from the Monday of the Assessment's week). Light and dark for each.

- [ ] **WS1** Tap the Week Summary card: the Week Summary screen opens (prototype variant B), with the week's dates, the Coach's sentence ("A full week, and two PRs.") and the line under it, then tiles for Workouts, the streak, kcal and protein a day, the change since the last Weigh-in, and Readiness against the week before. Back returns to Today.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **WS2** Under the tiles: "Weekly Budget · N of M met" with a chip for each Muscle short of it ("Calves 2/5"), then Progress with each PR ("⭐ PR · …" over what it beat) and each Exercise whose Working Level moved ("↑ 44 lb × 10", or "↓ back to … , missed twice"), then a bar for each day's kcal: green in range, orange under, red over, none on a day with no food logged. Weights are in your unit: switch kg and lb on Profile and open it again.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **WS3** On Today from Monday to Sunday before 6 pm, This week has "Last week ›" at the right of the streak row (with no streak, on its own). It opens the screen for the week before. From 6 pm on Sunday it's gone, and the new card opens the week just ended. It isn't there in the week you onboarded.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **WS4** In the week after a deload week, open "Last week": the screen says "DELOAD WEEK" over the dates and "A deload week, lighter on purpose.", and the Weekly Budget reads "Deload: lighter on purpose" with no Muscles listed as short. The card's Weekly Budget bar says the same.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **WS5** A week with no Weigh-in and no Check-ins has no Weigh-in or Readiness tile, and one with no food logged no kcal or protein tile and no "Calories each day". A week with nothing logged at all says "A quiet week." In airplane mode the screen says it needs a connection, with Try again.
  - iOS: Result: · Android: Result: · Notes:

## When the server isn't answering (#170, #174)

Needs the phone online with the API stopped, or the server otherwise unreachable while the phone has a network.

- [x] **NA1** With the app already open, stop the API, then search for a food, Save a food's portion and Log weight. Each stops loading within 15 s and says "Fit Coach isn't answering. Check your connection, or try again in a minute.", not that it needs a connection. Today, the Food tab and History say Fit Coach can't be reached, not "No connection". Start the API again: everything works without restarting the app.
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
