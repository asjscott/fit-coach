#!/bin/sh
# The signed-in app on the web build, against the in-memory API, with no Clerk account or .env. Stops both on exit.
# A fresh account each run, as the API's data goes with it: onboarded (as the route tests' user), or at onboarding
# with --fresh. Metro watches files, so edits show without a restart. Output goes to .expo/dev-signed-in.log, leaving
# .expo/dev.log to the user's own dev server
API_PORT=3187
WEB_PORT=8187
API=http://localhost:$API_PORT

stop() {
  trap - EXIT INT TERM
  lsof -tiTCP:$API_PORT -iTCP:$WEB_PORT -sTCP:LISTEN | xargs kill 2>/dev/null
}
trap stop EXIT INT TERM

PORT=$API_PORT CORS_ORIGINS=http://localhost:$WEB_PORT pnpm --filter @fit/api dev:local &

# No CI=1 here: it would stop Metro watching files. With no terminal there's nothing for Expo to prompt on anyway
DEV_LOG=.expo/dev-signed-in.log EXPO_PUBLIC_API_URL=$API EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_stub CLERK_STUB=1 \
  sh scripts/with-dev-log.sh expo start --port $WEB_PORT --clear </dev/null &

# The stub signs in as the API's dev user (user_dev), so onboarding it here is onboarding the app
if [ "$1" != "--fresh" ]; then
  until curl -sf -o /dev/null $API/health; do sleep 1; done
  # A JSON content type with no body is a 400, so the header goes only with a body
  json() {
    if [ -n "$3" ]; then curl -sf -X "$1" "$API$2" -H 'content-type: application/json' -d "$3" >/dev/null
    else curl -sf -X "$1" "$API$2" >/dev/null; fi
  }
  json POST /users &&
    json PATCH /user '{"profile":{"gender":"male","birthYear":1990,"heightCm":180,"weightKg":80,"goal":"build_muscle","daysPerWeek":3,"workoutLength":"standard","injuries":[],"activityLevel":"active"}}' &&
    json POST /user/equipment-profiles '{"name":"Home","location":"home","isPrimary":true,"tags":["dumbbells"],"loads":{"dumbbells":{"kind":"fixed","weightsKg":[8,10,12,14,16,18,20,22,24]}}}' &&
    echo "web:signed-in: onboarded user_dev (80 kg, build_muscle, 3 days, dumbbells at home)" ||
    echo "web:signed-in: couldn't onboard user_dev; the app will open at onboarding" >&2
fi

# In the background, as a shell runs a trap only once its foreground command ends
wait
