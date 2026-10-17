# Approval Queue Prototype

This module is a local approval gate only. It is not connected to YouTube or Instagram and cannot publish content by itself.

## Tests

From the repository root, run:

```bash
node --test youtube-agent/approval-queue.test.mjs
```

## Safety rules

- Items start in review.
- Approvals are separate for YouTube and Instagram.
- Approvals are tied to the exact media reference and platform payload using a SHA-256 version hash.
- Editing clears approvals and requires a new review.
- A publish claim is refused without current explicit approval.
- Uncertain publishing outcomes require reconciliation before another attempt.

## Production limitations

The JSON file store is for local development only. It does not provide cross-process locking, multi-user authentication, or cloud durability. No dashboard, scheduler, YouTube uploader, or Instagram API adapter is implemented here. Production needs a transactional shared database, secure media storage, authentication, and independently tested platform adapters. Keep YouTube test uploads private and public publishing disabled until those checks pass.
