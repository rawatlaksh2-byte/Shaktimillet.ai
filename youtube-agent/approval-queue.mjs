/**
 * Approval-first content queue for Shakti Millets.
 *
 * This module is intentionally platform-agnostic: it does not call YouTube or
 * Meta APIs. Use a durable shared database and authenticated UI before hosting
 * it for multiple users. JSON-file storage is for local development only.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";

const PLATFORMS = new Set(["youtube", "instagram"]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function hashContent(value) {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function platformHash(item, platform) {
  return hashContent({
    platform,
    mediaRef: item.mediaRef,
    payload: item.platformPayloads[platform],
  });
}

function validatePlatform(platform) {
  if (!PLATFORMS.has(platform)) throw new Error(`Unsupported platform: ${platform}`);
}

function validateItemInput(input) {
  if (!input || typeof input !== "object") throw new Error("Content item is required");
  if (!input.mediaRef || typeof input.mediaRef !== "string") throw new Error("mediaRef must identify the final media asset");
  if (!Array.isArray(input.platforms) || input.platforms.length === 0) throw new Error("Select at least one platform");
  for (const platform of input.platforms) {
    validatePlatform(platform);
    if (!input.platformPayloads?.[platform] || typeof input.platformPayloads[platform] !== "object") {
      throw new Error(`A final platform-specific payload is required for ${platform}`);
    }
  }
}

export class ApprovalQueue {
  constructor(filePath) {
    if (!filePath) throw new Error("A queue file path is required");
    this.filePath = resolve(filePath);
  }

  async #load() {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, "utf8"));
      if (!parsed || parsed.schemaVersion !== 1 || !Array.isArray(parsed.items) || !Array.isArray(parsed.audit)) {
        throw new Error("Queue file schema is invalid");
      }
      return parsed;
    } catch (error) {
      if (error.code === "ENOENT") return { schemaVersion: 1, items: [], audit: [] };
      throw error;
    }
  }

  async #save(db) {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${randomUUID()}.tmp`;
    await writeFile(tempPath, JSON.stringify(db, null, 2) + "\n", { mode: 0o600 });
    await rename(tempPath, this.filePath);
  }

  #audit(db, item, action, actor, details = {}) {
    db.audit.push({ at: new Date().toISOString(), itemId: item.id, action, actor, ...details });
  }

  #refreshStatus(item) {
    const approved = item.platforms.every((platform) =>
      item.approvals[platform]?.versionHash === platformHash(item, platform)
    );
    item.status = approved ? "approved" : "needs_review";
  }

  async create(input, actor = "system") {
    validateItemInput(input);
    const db = await this.#load();
    const now = new Date().toISOString();
    const item = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      status: "needs_review",
      mediaRef: input.mediaRef,
      platforms: [...new Set(input.platforms)],
      platformPayloads: structuredClone(input.platformPayloads),
      approvals: {},
      deliveries: {},
    };
    for (const platform of item.platforms) {
      item.deliveries[platform] = {
        status: "pending",
        attempts: 0,
        externalId: null,
        externalUrl: null,
        lastError: null,
        idempotencyKey: hashContent({ itemId: item.id, platform, versionHash: platformHash(item, platform) }),
      };
    }
    this.#audit(db, item, "created_needs_review", actor);
    db.items.push(item);
    await this.#save(db);
    return structuredClone(item);
  }

  async list() {
    const db = await this.#load();
    return structuredClone(db.items);
  }

  async get(id) {
    const db = await this.#load();
    const item = db.items.find((entry) => entry.id === id);
    if (!item) throw new Error("Content item not found");
    return structuredClone(item);
  }

  async edit(id, changes, actor) {
    const db = await this.#load();
    const item = db.items.find((entry) => entry.id === id);
    if (!item) throw new Error("Content item not found");
    if (Object.values(item.deliveries).some((d) => d.status === "published" || d.status === "publishing")) {
      throw new Error("This item has a published/in-flight delivery; create a new content item to preserve audit history");
    }
    const next = {
      mediaRef: changes.mediaRef ?? item.mediaRef,
      platforms: changes.platforms ?? item.platforms,
      platformPayloads: changes.platformPayloads ?? item.platformPayloads,
    };
    validateItemInput(next);
    const oldHashes = Object.fromEntries(item.platforms.map((p) => [p, platformHash(item, p)]));
    item.mediaRef = next.mediaRef;
    item.platforms = [...new Set(next.platforms)];
    item.platformPayloads = structuredClone(next.platformPayloads);
    item.approvals = {};
    const newDeliveries = {};
    for (const platform of item.platforms) {
      const previous = item.deliveries[platform];
      const changed = !previous || oldHashes[platform] !== platformHash(item, platform);
      newDeliveries[platform] = changed
        ? {
            status: "pending",
            attempts: 0,
            externalId: null,
            externalUrl: null,
            lastError: null,
            idempotencyKey: hashContent({ itemId: item.id, platform, versionHash: platformHash(item, platform) }),
          }
        : previous;
    }
    item.deliveries = newDeliveries;
    item.status = "needs_review";
    item.updatedAt = new Date().toISOString();
    this.#audit(db, item, "edited_approval_cleared", actor, { previousHashes: oldHashes });
    await this.#save(db);
    return structuredClone(item);
  }

  async approve(id, platform, approver) {
    validatePlatform(platform);
    if (!approver || !String(approver).trim()) throw new Error("Approver identity is required");
    const db = await this.#load();
    const item = db.items.find((entry) => entry.id === id);
    if (!item) throw new Error("Content item not found");
    if (!item.platforms.includes(platform)) throw new Error(`${platform} is not selected for this item`);
    const versionHash = platformHash(item, platform);
    item.approvals[platform] = { approver: String(approver).trim(), approvedAt: new Date().toISOString(), versionHash };
    item.updatedAt = new Date().toISOString();
    this.#refreshStatus(item);
    this.#audit(db, item, "platform_approved", approver, { platform, versionHash });
    await this.#save(db);
    return structuredClone(item);
  }

  /**
   * Claim a delivery only after matching platform-specific approval.
   * On uncertain network outcomes, call markNeedsReconciliation instead of
   * blindly retrying: social APIs may not honor our internal idempotency key.
   */
  async claimPublish(id, platform, actor) {
    validatePlatform(platform);
    const db = await this.#load();
    const item = db.items.find((entry) => entry.id === id);
    if (!item) throw new Error("Content item not found");
    if (!item.platforms.includes(platform)) throw new Error(`${platform} is not selected for this item`);
    const currentHash = platformHash(item, platform);
    if (item.approvals[platform]?.versionHash !== currentHash) {
      throw new Error(`Publishing blocked: ${platform} version has no current explicit approval`);
    }
    const delivery = item.deliveries[platform];
    if (delivery.status === "published") throw new Error(`${platform} is already marked published`);
    if (delivery.status === "publishing" || delivery.status === "needs_reconciliation") {
      throw new Error(`Publishing blocked: reconcile the existing ${platform} attempt first`);
    }
    if (delivery.status === "failed") {
      throw new Error("Automatic retry blocked; reconcile the platform first, then explicitly reset the delivery");
    }
    delivery.status = "publishing";
    delivery.attempts += 1;
    delivery.startedAt = new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    this.#audit(db, item, "publish_claimed", actor, { platform, versionHash: currentHash, attempt: delivery.attempts });
    await this.#save(db);
    return {
      item: structuredClone(item),
      platform,
      versionHash: currentHash,
      idempotencyKey: delivery.idempotencyKey,
      payload: structuredClone(item.platformPayloads[platform]),
      mediaRef: item.mediaRef,
    };
  }

  async markPublished(id, platform, result, actor) {
    validatePlatform(platform);
    const db = await this.#load();
    const item = db.items.find((entry) => entry.id === id);
    if (!item) throw new Error("Content item not found");
    const delivery = item.deliveries[platform];
    if (!delivery || delivery.status !== "publishing") throw new Error("No active publish claim exists");
    if (!result?.externalId) throw new Error("Platform externalId is required to record success");
    delivery.status = "published";
    delivery.externalId = String(result.externalId);
    delivery.externalUrl = result.externalUrl ? String(result.externalUrl) : null;
    delivery.publishedAt = new Date().toISOString();
    delivery.lastError = null;
    item.updatedAt = new Date().toISOString();
    const allPublished = item.platforms.every((p) => item.deliveries[p].status === "published");
    const allApproved = item.platforms.every((p) => item.approvals[p]?.versionHash === platformHash(item, p));
    item.status = allPublished ? "published" : allApproved ? "approved" : "needs_review";
    this.#audit(db, item, "published", actor, { platform, externalId: delivery.externalId });
    await this.#save(db);
    return structuredClone(item);
  }

  async markFailed(id, platform, error, actor, uncertain = false) {
    validatePlatform(platform);
    const db = await this.#load();
    const item = db.items.find((entry) => entry.id === id);
    if (!item) throw new Error("Content item not found");
    const delivery = item.deliveries[platform];
    if (!delivery || delivery.status !== "publishing") throw new Error("No active publish claim exists");
    delivery.status = uncertain ? "needs_reconciliation" : "failed";
    delivery.lastError = String(error || "Unknown publishing error").slice(0, 1000);
    delivery.finishedAt = new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    this.#audit(db, item, uncertain ? "publish_outcome_uncertain_reconciliation_required" : "publish_failed", actor, { platform, error: delivery.lastError });
    await this.#save(db);
    return structuredClone(item);
  }
}

export const supportedPlatforms = Object.freeze([...PLATFORMS]);
