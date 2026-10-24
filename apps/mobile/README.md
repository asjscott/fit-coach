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

The in-progress and Pending Workouts are stored with `expo-sqlite`, which on web runs SQLite as wasm in a worker and needs `SharedArrayBuffer`. Browsers only allow that when the page is served with these headers:

```
Cross-Origin-Embedder-Policy: credentialless
Cross-Origin-Opener-Policy: same-origin
```

`metro.config.js` adds them for the dev server only. **Any production web host must send them too**, or the app will load but saving a Workout will fail. On EAS Hosting, set them in `app.json`:

```json
["expo-router", { "headers": { "Cross-Origin-Embedder-Policy": "credentialless", "Cross-Origin-Opener-Policy": "same-origin" } }]
```

On any other host (Netlify, Vercel, a CDN…), add them to its headers config. These headers also stop the page loading cross-origin resources (images, scripts, iframes) that don't allow it, so check third-party embeds such as Clerk's sign-in still work. Docs: [expo-sqlite web setup](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/#web-setup).

The web build is a single-page app (`"web": { "output": "single" }` in `app.json`), so the host must serve `index.html` for every path (an SPA fallback or rewrite). Static output (`"static"`) breaks expo-sqlite in development: the dev server either fails with "Worker chunk not found for: …/expo-sqlite/web/worker.ts" or, with lazy bundling off, the app fails at runtime with "Bundle splitting is required for Web Worker imports". Revisit if a later Expo release fixes this and you want pre-rendered pages.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
