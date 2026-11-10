#!/bin/sh
# The signed-in app on the web build, against the in-memory API, with no Clerk account or .env. Stops both on exit.
# A fresh account each run, as the API's data goes with it
API_PORT=3187
WEB_PORT=8187

stop() {
  trap - EXIT INT TERM
  lsof -tiTCP:$API_PORT -iTCP:$WEB_PORT -sTCP:LISTEN | xargs kill 2>/dev/null
}
trap stop EXIT INT TERM

PORT=$API_PORT CORS_ORIGINS=http://localhost:$WEB_PORT pnpm --filter @fit/api dev:local &

CLERK_STUB=1 CI=1 EXPO_PUBLIC_API_URL=http://localhost:$API_PORT EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_stub \
  sh scripts/with-dev-log.sh expo start --port $WEB_PORT --clear &

# In the background, as a shell runs a trap only once its foreground command ends
wait
