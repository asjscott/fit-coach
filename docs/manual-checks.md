# Manual checks on the phone

Checks still to run for Planned Workouts (spec #77). The rest passed on an iPhone 14 on 2026-11-06.

Run from `apps/mobile` with `pnpm ios` / `pnpm android`. If something breaks, `apps/mobile/.expo/dev.log` has the error. Use a physical phone where you can: airplane mode is the point of the offline checks.

For each check, tick the box and fill in the result. Leave **Notes** empty when it passes cleanly; write what you saw when it doesn't, or when something felt off even if it technically passed.

Result codes: **✅ pass** · **❌ fail** · **⚠️ works but feels off** · **⏭ skipped / couldn't test**

## Session

- Date: 2026-11-06
- Device(s) and OS version: iPhone 17 Pro simulator, iOS 26.4
- Build (dev build / Expo Go / web, browser): Release simulator build, API on localhost
- Branch and commit: `dev`, ecdf9a5
- Simulator run: it has no airplane mode, so "offline" here means the API was down and Clerk stayed online. Ticked boxes passed here on iOS only.
- Phone run, 2026-11-09: iPhone 14, Release build from `fix/p11-clerk-offline-cold-start`, real airplane mode. P11 to P15 and P20 passed.

## Before you start

- **Test accounts** on the Clerk dev instance: a `+clerk_test` email takes the code `424242`.

### A release build, for P11 and P14

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
11. Sign in with a test account and finish the Assessment, so Today has a plan. Run P11 from there, then P14, and P12, P13, P15 and P20 while you're in real airplane mode.

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

## Real offline (airplane mode)

Expo Go can't reload offline. Load the app, then turn on airplane mode without closing it: that covers P12, P13, P15 and P20. P11 and P14 need a force-quit, so they need a release build on the phone.

- [x] **P11** **Clerk on a cold start with no signal.** Have a plan on Today, turn on airplane mode, force-quit, reopen. Today and the card should appear. If the app stays blank, Clerk's `isLoaded` stayed false: `(app)/_layout.tsx` renders nothing until then, and nothing else can pass. The stand-in couldn't show this. A likely fix is `__experimental_resourceCache` from `@clerk/expo/resource-cache`.
  - iOS: Result: ✅ · Android: Result: · Notes: Blank until Clerk was given its resource cache. With it, Today and the card appear in airplane mode.
- [x] **P12** Still in airplane mode: change the Length and equipment. The card follows, with your usual Length still selected first.
  - iOS: Result: ✅ · Android: Result: · Notes: Standard was selected first. Short went from 8 Exercises and 23 Sets to 5 and 15; Bodyweight only swapped in alternatives.
- [x] **P13** Start, log and finish. Start isn't held up by the Previous Sets request for long (each has a 4 s timeout). Today says "Connect to plan your next Workout".
  - iOS: Result: ✅ · Android: Result: · Notes: With a server that never answers, the five Previous Sets requests ran in parallel and Start took about 4 s. Finish was with connections refused. "Connect to plan your next Workout" showed. Offline, the ring went from 3 of 3 to 1 of 3, as History isn't known.
- [x] **P20** After that finish, Today shows "Done for today." with "Connect to plan your next Workout" on the card.
  - iOS: Result: ✅ · Android: Result: · Notes: "Done for today." with "Connect to plan your next Workout" on the card.
- [x] **P14** Force-quit and reopen, still offline: the Pending Workout, the message and native storage all hold.
  - iOS: Result: ✅ · Android: Result: · Notes: Force-quit and relaunch: the Pending Workout, the message and all three stored keys held. Clerk was still online, so this doesn't replace P11.
- [x] **P15** Turn signal back on, without touching the app, then with the app in the background. The upload and next plan arrive.
  - iOS: Result: ✅ · Android: Result: · Notes:

## Over time

These two don't hold up `main`: run them once it's merged and you're training.

- [ ] **P16** A new week: open the app on Monday. The plan is built for the new week, with nothing carried over. The walk couldn't show this, as it can't move the server's clock, so wait for a real Monday.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **P17** Week after week, do the same Exercises carry on, and do Previous Sets stay useful?
  - iOS: Result: · Android: Result: · Notes:
- [ ] **P18** Sign out: the plan and the stored User are gone from the phone, and the next account doesn't see them.
  - iOS: Result: ⚠️ half run, simulator · Android: Result: · Notes: The storage table was empty after sign-out. Deleted bytes stayed in the SQLite file, which the app can't read. The next account wasn't run: it needs another sign-in.

## Your call

Not a bug, but it needs your judgement once you've done some Workouts. Details in `docs/research/planner-simulation.md`.

- Do Workouts that fill their Length, at up to 214% of a Muscle's budget, feel like too much? Should a Workout stop at the budget?

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
