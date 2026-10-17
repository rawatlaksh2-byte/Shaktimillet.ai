#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_URL="https://github.com/darkzOGx/youtube-automation-agent.git"
UPSTREAM_COMMIT="941c3bee2b2c54f3f1a8e4dc9e034e061a5fed3a"
TARGET_DIR="${1:-agenttube}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -e "$TARGET_DIR" ]; then
  echo "Target already exists: $TARGET_DIR"
  echo "Choose another directory or remove it manually."
  exit 1
fi

git clone "$UPSTREAM_URL" "$TARGET_DIR"
git -C "$TARGET_DIR" checkout "$UPSTREAM_COMMIT"

# Apply the Shakti Millets 60-second / 6x10s vertical Shorts customization
# against the pinned, reviewed upstream revision.
node "$SCRIPT_DIR/patch-shakti-shorts.mjs" "$TARGET_DIR"

cd "$TARGET_DIR"
npm install

echo
echo "AgentTube installed and patched in: $TARGET_DIR"
echo "Pinned upstream commit: $UPSTREAM_COMMIT"
echo "Next:"
echo "1) Copy ../youtube-agent/.env.shakti.example to .env"
echo "2) Add your Gemini/OpenAI key locally"
echo "3) Run: npm run walkthrough"
echo "4) Connect YouTube OAuth"
echo "5) Run: npm start"
echo "6) In another terminal: node ../youtube-agent/apply-strategy.mjs"
echo
echo "Publishing remains private/approval-first in the supplied config."
