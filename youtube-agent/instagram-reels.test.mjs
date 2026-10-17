import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApprovalQueue } from "./approval-queue.mjs";
import { InstagramReelsPublisher } from "./instagram-reels.mjs";

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), "shakti-instagram-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const queue = new ApprovalQueue(join(dir, "queue.json"));
  const item = await queue.create({
    mediaRef: "https://media.example.test/shakti-reel.mp4",
    platforms: ["instagram"],
    platformPayloads: { instagram: { caption: "Ghar Ki Thali, Shakti Wali", format: "reel" } },
  }, "owner");
  return { queue, item };
}

function fakeFetch(calls) {
  return async (input, init = {}) => {
    const url = new URL(input);
    calls.push({ url, method: init.method || "GET", body: init.body, headers: init.headers });
    let payload;
    if (url.pathname.endsWith("/ig-test/media") && init.method === "POST") payload = { id: "container-test" };
    else if (url.pathname.endsWith("/container-test")) payload = { id: "container-test", status_code: "FINISHED", status: "Finished" };
    else if (url.pathname.endsWith("/ig-test/media_publish") && init.method === "POST") payload = { id: "media-test", permalink: "https://www.instagram.com/reel/test/" };
    else throw new Error("Unexpected fake API request");
    return { ok: true, status: 200, json: async () => payload };
  };
}

function publisher(calls) {
  return new InstagramReelsPublisher({
    igUserId: "ig-test",
    accessToken: "test-token-not-real",
    graphBaseUrl: "https://graph.instagram.com",
    apiVersion: "v25.0",
    fetchImpl: fakeFetch(calls),
  });
}

test("preparing a Reel creates a container but never publishes it", async () => {
  const calls = [];
  const api = publisher(calls);
  const { queue, item } = await fixture({ after: () => {} });
  const result = await api.prepareReel({
    queue, itemId: item.id,
    videoUrl: "https://media.example.test/shakti-reel.mp4",
    caption: "Ghar Ki Thali, Shakti Wali",
  });
  assert.equal(result.containerId, "container-test");
  assert.equal(result.status, "prepared_not_published");
  assert.equal(result.itemId, item.id);
  assert.ok(result.versionHash);
  assert.equal(calls.length, 1);
  assert.ok(!calls.some((call) => call.url.pathname.endsWith("/media_publish")));
  assert.equal(calls[0].method, "POST");
});

test("publishing requires an explicit human confirmation and current Instagram approval", async (t) => {
  const calls = [];
  const api = publisher(calls);
  const { queue, item } = await fixture(t);
  await assert.rejects(api.publishApprovedReel({
    queue, itemId: item.id, containerId: "container-test", actor: "owner",
  }), /explicit human Publish confirmation/);
  await assert.rejects(api.publishApprovedReel({
    queue, itemId: item.id, containerId: "container-test", actor: "owner",
    explicitPublishConfirmation: true,
  }), /has not been approved/);
  assert.equal(calls.length, 0);
});

test("approved Instagram Reel publishes only after the container is ready", async (t) => {
  const calls = [];
  const api = publisher(calls);
  const { queue, item } = await fixture(t);
  await queue.approve(item.id, "instagram", "owner");
  const prepared = await api.prepareReel({
    queue, itemId: item.id,
    videoUrl: item.mediaRef,
    caption: item.platformPayloads.instagram.caption,
  });
  const result = await api.publishApprovedReel({
    queue, itemId: item.id, containerId: prepared.containerId, actor: "owner",
    explicitPublishConfirmation: true, preparedVersionHash: prepared.versionHash,
  });
  assert.equal(result.status, "published");
  assert.equal(result.externalId, "media-test");
  assert.equal(result.externalUrl, "https://www.instagram.com/reel/test/");
  assert.equal(calls.length, 2);
  assert.ok(calls[0].url.pathname.endsWith("/container-test"));
  assert.equal(calls[0].url.searchParams.get("access_token"), null);
  assert.equal(calls[0].headers?.authorization, undefined);
  assert.ok(calls[1].url.pathname.endsWith("/ig-test/media_publish"));
  assert.equal(calls[1].url.searchParams.get("access_token"), null, "credentials are not placed in the URL");
  assert.equal(calls[1].headers.authorization, "Bearer test-token-not-real");
  assert.equal((await queue.get(item.id)).deliveries.instagram.status, "published");
});

test("a Reel that is still processing cannot be published", async (t) => {
  const { queue, item } = await fixture(t);
  await queue.approve(item.id, "instagram", "owner");
  const calls = [];
  const notReady = new InstagramReelsPublisher({
    igUserId: "ig-test", accessToken: "fake", graphBaseUrl: "https://graph.instagram.com",
    apiVersion: "v25.0",
    fetchImpl: async (input) => {
      calls.push(new URL(input));
      return { ok: true, status: 200, json: async () => ({ status_code: "IN_PROGRESS" }) };
    },
  });
  await assert.rejects(notReady.publishApprovedReel({
    queue, itemId: item.id, containerId: "container-test", actor: "owner",
    explicitPublishConfirmation: true, preparedVersionHash: (await import("./approval-queue.mjs")).hashContent({
      platform: "instagram", mediaRef: item.mediaRef, payload: item.platformPayloads.instagram,
    }),
  }), /container is not ready/);
  assert.equal((await queue.get(item.id)).deliveries.instagram.status, "pending");
  assert.equal(calls.length, 1);
});
