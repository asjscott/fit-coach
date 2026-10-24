# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Deploying the web version

The web build is static (`"web": { "output": "static" }` in `app.json`): every route is pre-rendered to its own HTML file, so any static host works without special headers. Routes with a parameter (`/history/[id]`, `/exercises/[slug]`) export as one `[id].html` / `[slug].html` file: navigating to them inside the app works anywhere, but opening such a URL directly needs the host to serve that file for the path (EAS Hosting does this; elsewhere, add a rewrite such as `/history/*` → `/history/[id].html`).

On web, the In-progress and Pending Workouts are kept in the browser's `localStorage` (`src/features/workouts/device-storage.web.ts`); on the phone they go through SQLite (`device-storage.ts`). `expo-sqlite`'s web build was dropped because it only works in one tab at a time and fails in Safari (see ADR 0001). The trade-off: a browser can clear `localStorage` (private windows, "clear site data"), so a Workout logged offline on web is less durable than on the phone.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
