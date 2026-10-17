import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApprovalQueue } from "./approval-queue.mjs";

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), "shakti-approval-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return new ApprovalQueue(join(dir, "queue.json"));
}

const input = () => ({
  mediaRef: "media://approved-reference-001",
  platforms: ["youtube", "instagram"],
  platformPayloads: {
    youtube: { title: "Millet recipe", description: "A Shakti Millets recipe draft", privacyStatus: "private" },
    instagram: { caption: "Ghar Ki Thali, Shakti Wali", format: "reel" },
  },
});

test("new content is review-only and cannot publish before platform approval", async (t) => {
  const queue = await fixture(t);
  const item = await queue.create(input(), "owner");
  assert.equal(item.status, "needs_review");
  await assert.rejects(queue.claimPublish(item.id, "youtube", "owner"), /no current explicit approval/);
});

test("approvals are platform-specific and bind to the exact version", async (t) => {
  const queue = await fixture(t);
  const item = await queue.create(input(), "owner");
  await queue.approve(item.id, "youtube", "owner");
  await assert.rejects(queue.claimPublish(item.id, "instagram", "owner"), /no current explicit approval/);
  const claim = await queue.claimPublish(item.id, "youtube", "owner");
  assert.equal(claim.payload.privacyStatus, "private");
  const done = await queue.markPublished(item.id, "youtube", { externalId: "test-video-123" }, "owner");
  assert.equal(done.deliveries.youtube.status, "published");
  assert.equal(done.deliveries.instagram.status, "pending");
  assert.equal(done.status, "needs_review", "item stays in review while another selected platform is unapproved");
});

test("any edit clears approvals and blocks the previously approved version", async (t) => {
  const queue = await fixture(t);
  const item = await queue.create(input(), "owner");
  await queue.approve(item.id, "youtube", "owner");
  const edited = await queue.edit(item.id, {
    platformPayloads: {
      youtube: { title: "Changed title", description: "Changed draft", privacyStatus: "private" },
      instagram: { caption: "Ghar Ki Thali, Shakti Wali", format: "reel" },
    },
  }, "owner");
  assert.equal(edited.status, "needs_review");
  assert.deepEqual(edited.approvals, {});
  await assert.rejects(queue.claimPublish(item.id, "youtube", "owner"), /no current explicit approval/);
});

test("uncertain API outcome requires reconciliation and cannot be retried blindly", async (t) => {
  const queue = await fixture(t);
  const item = await queue.create(input(), "owner");
  await queue.approve(item.id, "youtube", "owner");
  await queue.claimPublish(item.id, "youtube", "owner");
  await queue.markFailed(item.id, "youtube", "Request timed out after upload may have completed", "owner", true);
  await assert.rejects(queue.claimPublish(item.id, "youtube", "owner"), /reconcile the existing/);
});

test("audit trail is persisted and approver identity is mandatory", async (t) => {
  const queue = await fixture(t);
  const item = await queue.create(input(), "owner");
  await assert.rejects(queue.approve(item.id, "youtube", " "), /Approver identity is required/);
  await queue.approve(item.id, "youtube", "owner");
  const loaded = await queue.get(item.id);
  assert.equal(loaded.approvals.youtube.approver, "owner");
  assert.ok(loaded.approvals.youtube.versionHash);
  assert.equal(loaded.status, "needs_review", "Instagram remains unapproved");
  assert.ok((await queue.list()).length === 1);
});
