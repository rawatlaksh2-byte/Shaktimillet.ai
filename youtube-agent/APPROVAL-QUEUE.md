# Approval Queue Prototype

This is a local approval gate only. It is not connected to a live account by itself. The first rollout target is Instagram Reels.

## Tests

From the repository root, run:

```bash
node --test youtube-agent/approval-queue.test.mjs youtube-agent/instagram-reels.test.mjs
```

## Safety rules

- Items start in review.
- Instagram approval is explicit and bound to the exact media reference and caption/payload using a SHA-256 version hash.
- Editing clears approvals and requires a new review.
- The Instagram adapter can prepare a media container without publishing.
- Publishing requires current Instagram approval, a matching prepared-media version hash, a finished container, and a separate explicit human Publish confirmation.
- Uncertain publishing outcomes require reconciliation before another attempt.
- CI uses fake API responses and never posts to a real account.

## Production limitations

The JSON file store is for local development only. It does not provide cross-process locking, multi-user authentication, or cloud durability. The mobile approval dashboard, transactional shared database, secure token storage/refresh, and live-account acceptance tests are not implemented yet. Do not deploy the JSON store for production or enable scheduled/background publishing.
