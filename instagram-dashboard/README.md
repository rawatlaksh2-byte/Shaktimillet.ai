# Instagram Recipe Studio — prototype

A mobile-friendly, Instagram-first review dashboard for Shakti Millets. Built from the saved recipe storyboard prompts linked to the Shakti Millets Master Recipe DB.

## Open the prototype

Serve this directory as a static website, or open `index.html` in a browser. If testing clipboard copy from a local file, browser permissions may require serving it over localhost/HTTPS.

## Included content

The initial queue contains 15 millet/pulse recipe drafts adapted from the saved storyboard prompts:

- Kodo Millet Khichdi
- Foxtail Millet Vegetable Upma
- Ragi Dosa
- Barnyard Millet Pulao
- Kollu Dal
- Kambu Khichdi
- Jowar Vegetable Pulao
- Red Jowar Khichdi
- Kodo Millet Curd Rice
- Kodo Millet Parboiled Pulao
- Barnyard Millet Lemon Rice
- Little Millet Upma
- Browntop Millet Pulao
- Proso Millet Lemon Rice
- Foxtail Millet Pongal (explicitly held for recipe-sheet verification)

Actual rice-SKU recipes are excluded from this first queue; millet dishes with “lemon rice” or “curd rice” names are retained because the grain is millet. Content includes short Hindi voice-over drafts, preparation/cooking scene notes, caption drafts, and recipe review warnings.

Source reference: [Shakti Millets Master Recipe DB](https://drive.google.com/file/d/1NrklyW7oa6wXROgdQS49xJruYOzZ-GZZ/view). The source requires Google sign-in; the dashboard uses the saved prompt file already available to the project, not a live Drive connection.

## Prototype safety boundaries

- This is a **front-end prototype only**. No Instagram account is connected.
- Recipe video assets are not attached yet; the preview area clearly indicates this.
- Search and filters work. Captions can be edited and copied.
- Review/approval marks are temporary in-page state only and disappear on refresh.
- The Publish button is disabled. No network request to Instagram is made.
- The page contains no credentials, tokens, OAuth callback, public publish endpoint, or backend.
- Do not treat the current client-side “Approved” label as a durable approval record.

## Before real use

1. Add authenticated owner-only access.
2. Persist recipes, caption versions, approvals, and prepared Meta container IDs in a transactional database.
3. Put Meta credentials in server-side secret storage only.
4. Add CSRF protection, rate limits, audit events, and duplicate/uncertain-outcome reconciliation.
5. Add secure video storage/hosting that returns publicly reachable HTTPS media URLs for Meta to fetch.
6. Wire separate Approve and explicit Publish-confirmation server actions; keep publishing manual (no background scheduler).
7. Verify the Meta login flow, permissions, account type, API version, and publishing requirements.
8. Test with the connected account only after a human has reviewed the exact final video and caption.

Recipe details are concise adaptations of the saved storyboard prompts, not a substitute for verifying the complete master recipe. Check exact ingredient quantities, cooking ratios, food safety and narration timing before producing or publishing a clip. Health-benefit claims are intentionally not added to captions.
