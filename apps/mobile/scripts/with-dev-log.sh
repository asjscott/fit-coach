#!/bin/sh
# Runs a dev server and records its output to .expo/dev.log (overwritten each run), so agents can read the current
# error without it being pasted. In a terminal, macOS's `script` records while keeping Expo's keyboard shortcuts;
# without one (agents, CI) there is nothing interactive to keep, so output is teed
mkdir -p .expo
if [ -t 0 ] && [ "$(uname)" = "Darwin" ]; then
  exec script -q -F .expo/dev.log "$@"
fi
"$@" 2>&1 | tee .expo/dev.log
