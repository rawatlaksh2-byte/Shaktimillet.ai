# Shakti Millets Automation

## Current milestone: Instagram Reels first

We are implementing the Instagram workflow before returning to YouTube. Nothing is connected to a live account, and no public Reel has been published.

- [Instagram-first rollout guide](youtube-agent/INSTAGRAM-FIRST.md)
- [Instagram Reels adapter](youtube-agent/instagram-reels.mjs)
- [Instagram adapter tests](youtube-agent/instagram-reels.test.mjs)
- [Approval queue prototype](youtube-agent/approval-queue.mjs)
- [Approval queue tests](youtube-agent/approval-queue.test.mjs)
- [Approval queue safety rules](youtube-agent/APPROVAL-QUEUE.md)
- [Deployment runbook](youtube-agent/SOCIAL-DEPLOYMENT-RUNBOOK.md)

The adapter supports creating a Reel container and, after explicit approval plus a separate explicit Publish confirmation, requesting publication through Meta's official API. The queue still uses local JSON storage, so the project is **not production-ready** until an authenticated mobile-friendly approval screen and durable shared database are implemented and tested.

No API keys or OAuth tokens belong in this repository. Do not enable background/scheduled publishing for this milestone.