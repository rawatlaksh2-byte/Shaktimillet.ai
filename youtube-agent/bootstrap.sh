#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_URL="https://github.com/darkzOGx/youtube-automation-agent.git"
TARGET_DIR="${1:-agenttube}"

if [ -e "$TARGET_DIR" ]; then
  echo "Target already exists: $TARGET_DIR"
  echo "Choose another directory or remove it manually."
  exit 1
fi

git clone "$UPSTREAM_URL" "$TARGET_DIR"
cd "$TARGET_DIR"
npm install

echo
echo "AgentTube installed in: $TARGET_DIR"
echo "Next:"
echo "1) Copy ../youtube-agent/.env.shakti.example to .env"
echo "2) Add your Gemini/OpenAI key locally"
echo "3) Run: npm run walkthrough"
echo "4) Connect YouTube OAuth"
echo "5) Run: npm start"
echo "6) In another terminal: node ../youtube-agent/apply-strategy.mjs"
echo
echo "Publishing remains private/approval-first in the supplied config."
