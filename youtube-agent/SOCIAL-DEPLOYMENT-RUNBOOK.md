# Shakti Millets YouTube + Instagram Automation — Deployment Runbook

Status: **not deployed**. This runbook documents the safe first deployment. It does not claim that either platform is connected or publishing has been tested.

## Non-negotiable publishing gate

- Content starts in `draft`.
- A human must review and explicitly approve the final media, caption, platform, and publish time.
- Any edit after approval invalidates that approval and returns the item to `draft`.
- YouTube test uploads must be `private`.
- Instagram must not publish until the approval workflow and Meta authorization are verified.
- No public auto-publishing, unattended schedule, or auto-approval is enabled by default.

## Phase 1 — YouTube local smoke test

From a local computer with Git, Node.js/npm, and a supported video toolchain installed:

```bash
git clone https://github.com/rawatlaksh2-byte/Shaktimillet.ai.git
cd Shaktimillet.ai
git checkout youtube-automation
bash youtube-agent/bootstrap.sh
cp youtube-agent/.env.shakti.example agenttube/.env
cd agenttube
npm run walkthrough
npm start
```

During the walkthrough, configure exactly one supported text provider (Gemini or OpenAI) and complete Google's Desktop OAuth flow for the intended Shakti Millets YouTube channel. Put credentials only in the local `.env` or the provider's secure authorization flow; never commit or paste secrets into chat/issues.

In a second terminal, from the repository root:

```bash
node youtube-agent/apply-strategy.mjs
```

Open `http://localhost:3456`, review the saved strategy, then generate one draft. Do not choose any option that enables public auto-publishing.

### YouTube acceptance checklist

- [ ] The dashboard starts and strategy is saved as draft.
- [ ] One draft has exactly six 10-second scene slots (60 seconds total).
- [ ] The exported video is vertical 9:16 and plays with valid narration/captions.
- [ ] Product/logo/packaging visuals match approved references.
- [ ] Claims about health, nutrition, price, stock, discounts and certification are factual and source-checked.
- [ ] Title, description and thumbnail are reviewable before upload.
- [ ] If uploaded for testing, YouTube privacy is confirmed as **private** in YouTube Studio.
- [ ] No public publish or schedule action happens without a fresh human approval.

YouTube's API allows an upload request to set `status.privacyStatus`; the implementation must explicitly set `private` for test uploads rather than rely on a default.

## Phase 2 — Instagram prerequisites

Before implementing or enabling Instagram publishing, confirm:

1. The Instagram account is a Professional account (Business or Creator).
2. It is connected to the appropriate Facebook Page / Meta business setup required by the chosen Meta API flow.
3. The Meta developer app, Instagram publishing product/use case, redirect URI and required permissions are configured.
4. The account owner completes authorization through Meta's official login/consent screen.
5. The integration stores tokens securely, handles expiry/re-authorisation, and logs API errors without logging secrets.

Do not ask for passwords or tokens in chat. Do not use browser-password scraping or unofficial endpoints. If the account/API setup cannot publish Reels through the approved API, stop and surface that blocker rather than silently switching to a risky workaround.

## Phase 3 — Shared approval queue (required before Instagram goes live)

A single queue should store one content item with platform-specific delivery records:

- Content ID, status, created/updated timestamps
- Video file/reference, title, caption, hashtags, thumbnail/cover
- Selected platforms (YouTube, Instagram, or both)
- Factual/brand-review flags and evidence/notes
- Approval identity and timestamp, plus a content-version hash
- Requested publish time and timezone
- Per-platform status, external post ID/URL, last error and retry count

Suggested states: `draft → needs_review → approved → queued → publishing → published`, with `failed` and `rejected` terminal/review states. Any content mutation resets status to `needs_review` and clears prior approval. The publisher must refuse to publish if the approved version hash does not match the current content hash.

For each platform, approval must be explicit for the exact final media and caption. An approval for YouTube must not automatically approve Instagram copy, and vice versa, unless the approver sees and explicitly approves both platform versions together.

## Phase 4 — Controlled release

1. Test YouTube privately.
2. Complete Instagram authorization and test with an eligible draft only after Meta prerequisites are verified.
3. Confirm that a draft cannot publish before approval, even after restart/retry.
4. Confirm duplicate/retry protection so a timeout does not create duplicate posts.
5. Confirm edits invalidate approval.
6. Only then enable a human-triggered publish action for each approved platform.
7. Add scheduling only after the approval gate, audit log, failure handling, and token refresh are tested.

## Shakti Millets content guardrails

Use Hindi/Hinglish by default. Content pillars: Know Your Millet; Millet Recipes; unpolished vs semi-polished vs parboiled; regional names/grain identification; cooking/storage tips; product education; retail/wholesale buying guidance. Use the brand line “Ghar Ki Thali, Shakti Wali”. Do not invent medical/nutrition claims, prices, stock, discounts, certifications or product availability. Preserve the approved logo and pouch design.

## Current limitation

This repository's `youtube-agent/` folder is a YouTube AgentTube configuration/patch scaffold. This runbook does **not** represent a completed Instagram API adapter, shared queue, deployment, OAuth connection, or successful platform test. Those must be implemented and verified before the automation is described as live.
