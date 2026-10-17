<div align="center">

<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

  <h1>Built with AI Studio</h2>

  <p>The fastest path from prompt to production with Gemini.</p>

  <a href="https://aistudio.google.com/apps">Start building</a>

</div>

## Shakti Millets YouTube + Instagram Automation

A draft AgentTube integration scaffold is available in [youtube-agent/](youtube-agent/README.md). The scaffold contains no API keys or OAuth secrets.

- [Approval queue prototype and safety rules](youtube-agent/APPROVAL-QUEUE.md)
- [Approval queue implementation](youtube-agent/approval-queue.mjs)
- [Approval queue automated tests](youtube-agent/approval-queue.test.mjs)
- [Deployment runbook](youtube-agent/SOCIAL-DEPLOYMENT-RUNBOOK.md)

**Deployment status: not configured.** The approval queue is local-development-only and does not itself upload to YouTube or Instagram. No platform adapter, shared production database, account connection, or live publishing has been verified. Use the runbook before any deployment.