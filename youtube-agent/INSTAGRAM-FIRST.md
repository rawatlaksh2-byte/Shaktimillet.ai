# Instagram-first rollout — Shakti Millets

**Scope for this phase:** Instagram Reels only. YouTube upload, OAuth and scheduling are out of scope for this milestone.

## Implemented in this branch

- `instagram-reels.mjs`: adapter for Meta's official Instagram API.
- `prepareReel()`: creates a Reels media container only; it does **not** publish.
- `publishApprovedReel()`: refuses to publish without an explicit human confirmation flag, current Instagram approval, a matching prepared-media version hash, and a finished container.
- Access token is sent as an Authorization bearer header, not placed in URLs or logged intentionally.
- If the publish request outcome is uncertain, the queue is marked for reconciliation so an operator must check Instagram before retrying.
- Tests use a fake API; they do not contact Instagram or need credentials.

## Test locally

From the repository root, using Node.js 20:

```bash
node --test youtube-agent/approval-queue.test.mjs youtube-agent/instagram-reels.test.mjs
```

The tests are also run by GitHub Actions.

## Required Instagram setup

1. Use an Instagram **Professional** account (Business or Creator).
2. Create/configure a Meta developer app and enable the Instagram API / content publishing product.
3. Use the matching official login flow and grant the current publishing permissions required by that flow. For Instagram Login, check Meta's current requirements for `instagram_business_basic` and `instagram_business_content_publish`.
4. Store the Instagram user ID and access token as environment secrets, not in GitHub files, source code, screenshots, or chat.
5. Provide the final Reel through a publicly reachable HTTPS media URL. The URL must remain accessible while Meta fetches the video.
6. Validate the API version and account permissions against the Meta developer dashboard before a real account test.

See Meta's official API collection:
https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api

## Environment variables

Set these only in a local ignored `.env` or hosting secret manager:

- `IG_USER_ID`
- `IG_ACCESS_TOKEN`
- `IG_GRAPH_BASE_URL=https://graph.instagram.com` for the Instagram Login flow
- `IG_GRAPH_API_VERSION` (verify the version enabled for your Meta app; the example file currently shows `v25.0`)

If the existing Meta app uses Facebook Login instead, do not blindly reuse the base URL or token model; verify the correct official flow and permissions first.

## Safety contract

- Preparing a container is not the same as publishing it.
- Each post must be reviewed and approved in the queue.
- The exact media URL and caption must match the queue item.
- A separate, explicit human-triggered Publish action is required.
- Never publish directly from CI, a scheduled job, or a background worker in this phase.
- Do not paste credentials into ChatGPT or commit them to GitHub.

## Not yet production-ready

The current approval queue stores JSON on the local filesystem. It is a prototype, not safe for concurrent requests or shared production hosting. The app still needs an authenticated mobile-friendly review screen, a transactional shared database, durable storage for the prepared container ID and version hash, secure token storage/refresh, deployment, and a real account test. The adapter is not considered live until these are implemented and verified.

**No Instagram account has been connected or any Reel published by these code changes.**
