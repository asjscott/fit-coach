# Fit Coach

A workout logging and coaching app. An Expo (React Native) app talks to a Fastify API backed by MongoDB, with
sign-in through Clerk. Domain terms are in [GLOSSARY.md](GLOSSARY.md) and decisions in [docs/adr/](docs/adr/).

| Path               | What it is                                            |
| ------------------ | ----------------------------------------------------- |
| `apps/api`         | Fastify API (`@fit/api`)                              |
| `apps/mobile`      | Expo app for iOS, Android and web (`@fit/mobile`)     |
| `packages/engines` | Pure logic shared by the app and API (`@fit/engines`) |
| `packages/shared`  | Shared types and schemas (`@fit/shared`)              |

## Setting up a new machine

### 1. Node and pnpm

Install Node 22 (the version in [.nvmrc](.nvmrc), and what CI uses), then pnpm:

```sh
nvm install        # or: fnm use
npm install -g pnpm
```

Any pnpm will do: `devEngines` in [package.json](package.json) makes it download and switch to the exact version the
repo pins. Use pnpm rather than npm/npx inside the repo, since npm refuses to run there.

### 2. Dependencies

```sh
git clone https://github.com/asjscott/fit-coach.git
cd fit-coach
pnpm install
# Generates apps/mobile/expo-env.d.ts, which typecheck and lint need
pnpm --filter @fit/mobile exec expo customize tsconfig.json
```

### 3. Environment

```sh
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Each example file says where its values come from: the connection string from MongoDB Atlas and the keys from the
Clerk dashboard. A new database needs the exercise catalogue: `pnpm --filter @fit/api seed:exercises`.

### 4. Device tooling

The quickest targets are the browser (press `w` in the Expo dev server) and
[Expo Go](https://expo.dev/go) on a phone. Simulators are optional:
[Xcode for the iOS Simulator](https://docs.expo.dev/workflow/ios-simulator/) and
[Android Studio for the emulator](https://docs.expo.dev/workflow/android-studio-emulator/).

On a phone, `localhost` is the phone itself, so point `EXPO_PUBLIC_API_URL` at your machine's LAN IP
(e.g. `http://192.168.1.20:3000`) or use the production API (below).

### 5. Claude Code and skills

Install [Claude Code](https://docs.claude.com/en/docs/claude-code), then
[mattpocock/skills](https://github.com/mattpocock/skills) globally. Run this **outside** the repo, as `devEngines`
gets in the way inside it:

```sh
cd ~
pnpm dlx skills@latest add mattpocock/skills -g -a claude-code
```

This puts the skills in `~/.agents/skills`, linked into `~/.claude/skills`. Don't also install the
`mattpocock-skills` Claude plugin, or every skill shows up twice. There's no need to run
`/setup-matt-pocock-skills`, because its output is already committed in [CLAUDE.md](CLAUDE.md) and
[docs/agents/](docs/agents/).

## Running

The usual setup is the API and the app in two terminals:

```sh
pnpm --filter @fit/api dev        # http://localhost:3000, reloads on change
pnpm --filter @fit/mobile start   # Expo dev server; w = web, i = iOS, a = Android
```

`ios`, `android` and `web` scripts start Expo straight onto that target. The dev server's output is also written to
`apps/mobile/.expo/dev.log`, which is where Claude Code reads bundling and runtime errors from.

**API without secrets.** `pnpm --filter @fit/api dev:local` runs against a throwaway in-memory MongoDB with Clerk
switched off. It doesn't need `apps/api/.env`, and data is gone when it stops. Every request is user `user_dev`
unless an `X-Dev-User` header names another, so it can be driven with curl. The app still works against it (it needs
the Clerk publishable key to sign in, but the API ignores the token).

**App against production.** `pnpm --filter @fit/mobile start:prod-api` points the app at the deployed API.

## Checks

These are what CI runs ([.github/workflows/ci.yml](.github/workflows/ci.yml)):

```sh
pnpm format:check   # pnpm format to fix
pnpm lint
pnpm typecheck
pnpm test
```

CI runs once per commit, on pull requests and on pushes to `dev` and `main`. A newer push cancels the run it replaces.

The web storage end-to-end tests use Playwright, which needs its browsers installed once. CI runs them
([.github/workflows/web-storage.yml](.github/workflows/web-storage.yml)) only when a change touches the files they
exercise. Bump that workflow's Playwright image tag along with `@playwright/test`.

```sh
pnpm --filter @fit/mobile exec playwright install chromium webkit
pnpm --filter @fit/mobile test:web
```

## Deployment

The API is deployed on Render from `main`. Work lands on `dev` first and reaches `main` by pull request.
