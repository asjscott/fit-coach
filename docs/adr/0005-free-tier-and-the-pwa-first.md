# Free tier, and the installed web app first

Fit Coach has one user, its author, and should cost nothing or close to it. The paid Apple Developer account is what native iOS needs for push notifications, HealthKit, TestFlight and installs that last more than 7 days, so without it the native app would have to be re-signed with a cable every week and still couldn't notify. The Expo web build, installed to the iPhone's home screen as a PWA, gets web push (iOS 16.4+), the camera for barcodes and installs that don't expire, for free. So the PWA is the daily app, the native build keeps compiling in CI but isn't shipped, and every service is on a free tier: Cloudflare Pages for the web app, Render's free instance for the API, Atlas M0, Clerk, Sentry and Gemini Flash's free tier.

## Consequences

- The web app has to work offline at the gym as native does today ([0001](0001-history-lives-on-the-server.md)): a service worker, IndexedDB instead of `localStorage`, and `navigator.storage.persist()`. That opens M6.
- Apple Health and Health Connect are out. Watch data comes in through Strava, whose API is free (M10).
- Render's free instance sleeps after 15 minutes and takes about 50 seconds to wake, so the app relies on what it has cached, and anything scheduled has to wake it from outside ([0006](0006-scheduled-jobs-through-github-actions.md)).
- An LLM is never needed for a feature's core. Where one is used, it goes through a provider-agnostic interface, so a paid model can replace the free one.
- No app stores and no other users, so the PDF's GDPR flows, demo videos and store submissions are dropped.

## Considered Options

- **Native iOS on a free Personal Team**: the code already runs there, but it expires every 7 days and has no push or HealthKit.
- **Pay for the Apple account ($99 a year)**: everything native works, but it breaks the cost constraint. It stays the way back if that changes.
