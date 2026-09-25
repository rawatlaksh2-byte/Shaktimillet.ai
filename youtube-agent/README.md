# Shakti Millets × AgentTube

This folder is a safe Shakti Millets configuration and patch layer for the upstream AgentTube project:
https://github.com/darkzOGx/youtube-automation-agent

It deliberately does **not** store API keys, Google OAuth secrets or YouTube tokens.

## What is ready

- India/YouTube defaults
- Shakti Millets audience and channel strategy
- Content pillars and factual/brand guardrails
- Vertical 9:16 generation settings
- **Shakti Shorts mode: exactly 6 scene slots × 10 seconds = 60 seconds**
- 60-second narration/video target with padding/trimming at final mux
- 6-beat caption timing
- 6-beat visual prompt generation
- Approval-first/private publishing
- Script to load the strategy into AgentTube
- Bootstrap installer pinned to the reviewed AgentTube upstream revision

## What the patch changes

When `SHAKTI_SHORTS_MODE=true` and the strategy length is `short`:

1. Script generation fails closed unless a live AI text provider is configured.
2. The writer must return exactly 6 concise scenes.
3. Unsupported health, nutrition, price, stock and certification claims remain blocked for review.
4. Narration is built from those same 6 beats without generic “Section 1” filler.
5. Captions are timed into six 10-second slots.
6. The scene manifest stores six 10-second scenes.
7. The low-cost slideshow path renders a vertical 9:16, 60-second video.
8. Final audio/video mux is capped to 60 seconds and pads shorter narration with silence rather than stretching speech.
9. Public auto-publishing stays off.

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

During the walkthrough, add **one** live text provider (Gemini or OpenAI) and connect the Shakti Millets YouTube account through Google's Desktop OAuth flow.

Keep AgentTube running, then in another terminal:

```bash
cd Shaktimillet.ai
node youtube-agent/apply-strategy.mjs
```

Open http://localhost:3456 and review the saved channel strategy before choosing **Activate & run now**.

## Important first-run rule

Do not enable automatic public publishing. The first successful test should:

1. Generate one 60-second Shakti Millets draft with 6 scenes.
2. Use no unsupported health claims.
3. Render valid narration and a vertical 9:16 MP4.
4. Keep product/packaging details within approved brand references.
5. Produce title, description and thumbnail drafts.
6. Remain private until human approval.

## Upstream updates

The bootstrap currently pins AgentTube commit `941c3bee2b2c54f3f1a8e4dc9e034e061a5fed3a`. Do not silently move to a newer upstream revision: the patcher intentionally fails if expected code no longer matches, so upstream changes can be reviewed before being adopted.
