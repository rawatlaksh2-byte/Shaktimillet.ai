# Shakti Millets × AgentTube

This folder is a safe Shakti Millets configuration layer for the upstream AgentTube project:
https://github.com/darkzOGx/youtube-automation-agent

It deliberately does **not** store API keys, Google OAuth secrets or YouTube tokens.

## What is ready

- India/YouTube defaults
- Shakti Millets audience and channel strategy
- Content pillars and guardrails
- Vertical-video settings
- Approval-first publishing
- A script to load the strategy into AgentTube
- Bootstrap script for installing the upstream project

## First local test

```bash
cd Shaktimillet.ai
git checkout youtube-automation

bash youtube-agent/bootstrap.sh
cp youtube-agent/.env.shakti.example agenttube/.env
cd agenttube
npm run walkthrough
npm start
```

Keep AgentTube running, then in another terminal:

```bash
cd Shaktimillet.ai
node youtube-agent/apply-strategy.mjs
```

Open http://localhost:3456 and review the saved channel strategy.

## Important limitation

AgentTube's upstream “short” preset currently means roughly 2–4 minute source content. Its built-in Shorts workflow can repurpose approved productions into vertical Shorts. Shakti Millets' preferred ~60-second / 6×10-second format needs a small customization before we rely on it for final production.

## Phase 1 acceptance test

Do not enable automatic public publishing yet. The first successful test should:

1. Generate one Shakti Millets draft.
2. Use no unsupported health claims.
3. Render valid audio/video.
4. Preserve approved brand/product visuals.
5. Produce title, description and thumbnail draft.
6. Stay private until human approval.
