# A few invited users, and the Coach talks about tomorrow

The product is a personal trainer you tell what you did and ate, today or yesterday, and that tells you what to do today or tomorrow. Two earlier records don't fit that. [ADR 0005](0005-free-tier-and-the-pwa-first.md) says the app has one user, its author; it now has the author and one or two people they invite. [ADR 0004](0004-spec-77-replaces-the-plans-m5.md) replaced "tomorrow's session" with "the next Planned Workout", as the app has no fixed weekdays; the Coach now says whether tomorrow is a training day or a Rest Day, and then names the next Planned Workout.

## Consequences

- **Invite-only.** Sign-up is restricted by Clerk's allowlist, and the invites go out in M13, once production on `main` is the daily app. Each user has their own profile, Equipment Profiles, targets and timezone, and nothing is shared between them. The API already scopes every route by Clerk `userId`; from now on no spec may assume a single user, so M8's jobs loop over users in each one's timezone, and M13's export and delete work per user.
- Still no app stores, GDPR flows or growth features. Everything stays on free tiers; Gemini's free limits and Atlas M0 are checked against three users.
- **Tomorrow.** M8's evening summary reads "Tomorrow: Legs, Standard" or "Tomorrow: Rest Day · next up Legs", from the Rest Day rule. The Rest Day rule also gains a hard Activity yesterday (M10, threshold in its spec).
- **Telling the coach.** Structured logging stays the backbone, and progression needs exact Sets. One text box on Today, "yesterday I ran 10k, had eggs and toast", turns into dated Food Entries (M7) and Activities (M10) behind a confirm screen. It reverses M10's "LLM parsing of Activities is dropped". The forms still do everything without it, so 0005's "an LLM is never needed for a feature's core" stands.
- **Backdating.** Food Entries, Activities and a Manual Workout can be logged for an earlier day, and count from that day in the Week Ledger, Fatigue and progression.
- **Food advice, not meal plans.** The Coach nudges against targets ("60 g of protein to go", tomorrow's targets in the evening summary). Food doesn't change the Planned Workout; the Check-in covers a bad day. The meal planner stays cut.

## Considered Options

- **Keep one user**: simplest, but the author wants to share it with one or two people.
- **Invite others now, in M6**: they would train on an app still changing under them, and staging is where the author lives with each milestone.
- **Make a chat the main screen**: closer to the pitch, but it would make an LLM core and replace a live logger that works offline at the gym.
- **Keep "next"**: true when there are no fixed weekdays, but the user plans by today and tomorrow, and the Rest Day rule can already answer whether tomorrow is a training day.
