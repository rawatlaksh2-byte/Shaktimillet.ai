/**
 * Instagram Reels adapter using Meta's official Instagram API.
 *
 * No scheduled/background publishing. prepareReel() only creates a media
 * container; publishApprovedReel() requires an explicit confirmation flag,
 * a current Instagram approval in ApprovalQueue, and the container ID.
 *
 * Keep credentials in environment variables / hosting secrets, never source.
 */
const DEFAULT_GRAPH_BASE = "https://graph.instagram.com";

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
}

function safeError(payload, status) {
  const message = payload?.error?.message || payload?.message || `Meta API returned HTTP ${status}`;
  const code = payload?.error?.code ? ` (code ${payload.error.code})` : "";
  return `Instagram API error: ${String(message).slice(0, 500)}${code}`;
}

export class InstagramReelsPublisher {
  constructor({
    igUserId = process.env.IG_USER_ID,
    accessToken = process.env.IG_ACCESS_TOKEN,
    graphBaseUrl = process.env.IG_GRAPH_BASE_URL || DEFAULT_GRAPH_BASE,
    apiVersion = process.env.IG_GRAPH_API_VERSION,
    fetchImpl = globalThis.fetch,
  } = {}) {
    this.igUserId = requireString(igUserId, "IG_USER_ID");
    this.accessToken = requireString(accessToken, "IG_ACCESS_TOKEN");
    this.graphBaseUrl = requireString(graphBaseUrl, "IG_GRAPH_BASE_URL").replace(/\/$/, "");
    this.apiVersion = requireString(apiVersion, "IG_GRAPH_API_VERSION");
    if (!/^v\d+\.\d+$/.test(this.apiVersion)) throw new Error("IG_GRAPH_API_VERSION must look like v25.0");
    if (typeof fetchImpl !== "function") throw new Error("Fetch implementation is unavailable");
    this.fetchImpl = fetchImpl;
  }

  #endpoint(path) {
    return `${this.graphBaseUrl}/${this.apiVersion}/${path.replace(/^\//, "")}`;
  }

  async #request(path, { method = "GET", params = {} } = {}) {
    const url = new URL(this.#endpoint(path));
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...params, access_token: this.accessToken })) {
      if (value !== undefined && value !== null) body.set(key, String(value));
    }
    if (method === "GET") {
      for (const [key, value] of body.entries()) url.searchParams.set(key, value);
    }
    const response = await this.fetchImpl(url.toString(), {
      method,
      headers: method === "GET" ? {} : { "content-type": "application/x-www-form-urlencoded" },
      ...(method === "GET" ? {} : { body }),
    });
    let payload;
    try { payload = await response.json(); }
    catch { throw new Error(`Instagram API returned a non-JSON response (HTTP ${response.status})`); }
    if (!response.ok || payload?.error) throw new Error(safeError(payload, response.status));
    return payload;
  }

  /**
   * Prepare only. This does not publish. videoUrl must be a public HTTPS URL
   * that Meta can fetch. Persist the returned containerId with the queue item.
   */
  async prepareReel({ videoUrl, caption, shareToFeed = true }) {
    const url = new URL(requireString(videoUrl, "videoUrl"));
    if (url.protocol !== "https:") throw new Error("videoUrl must use HTTPS");
    if (typeof caption !== "string" || !caption.trim()) throw new Error("caption is required");
    const result = await this.#request(`${this.igUserId}/media`, {
      method: "POST",
      params: {
        media_type: "REELS",
        video_url: url.toString(),
        caption: caption.trim(),
        share_to_feed: shareToFeed,
      },
    });
    if (!result?.id) throw new Error("Instagram did not return a media container ID");
    return { containerId: String(result.id), status: "prepared_not_published" };
  }

  async getContainerStatus(containerId) {
    const id = requireString(containerId, "containerId");
    return this.#request(id, { params: { fields: "status_code,status" } });
  }

  /**
   * Call only from an authenticated human-triggered Publish button after the
   * user has reviewed this exact post. The boolean is an extra guard, not
   * authentication; the hosting route must enforce the logged-in owner.
   */
  async publishApprovedReel({
    queue,
    itemId,
    containerId,
    actor,
    explicitPublishConfirmation = false,
  }) {
    if (explicitPublishConfirmation !== true) {
      throw new Error("Publishing blocked: an explicit human Publish confirmation is required");
    }
    if (!queue || typeof queue.claimPublish !== "function") throw new Error("ApprovalQueue is required");
    const id = requireString(containerId, "containerId");
    const item = await queue.get(requireString(itemId, "itemId"));
    if (!item.platforms.includes("instagram") || !item.approvals?.instagram) {
      throw new Error("Publishing blocked: this Instagram post has not been approved");
    }

    const status = await this.getContainerStatus(id);
    if (status.status_code !== "FINISHED") {
      throw new Error(`Publishing blocked: Reel container is not ready (${status.status_code || "unknown"})`);
    }

    // This atomicity is only best-effort with the current JSON prototype.
    // Production must use a transactional shared database.
    await queue.claimPublish(item.id, "instagram", actor);
    try {
      const result = await this.#request(`${this.igUserId}/media_publish`, {
        method: "POST",
        params: { creation_id: id },
      });
      if (!result?.id) {
        await queue.markFailed(item.id, "instagram", "Meta response did not include a published media ID", actor, true);
        throw new Error("Instagram publish result is uncertain; reconcile the account before retrying");
      }
      const externalUrl = result.permalink || null;
      await queue.markPublished(item.id, "instagram", { externalId: String(result.id), externalUrl }, actor);
      return { externalId: String(result.id), externalUrl, status: "published" };
    } catch (error) {
      // If queue status is still publishing, the request may have reached Meta.
      // Mark uncertain so the queue refuses a blind retry.
      try {
        const current = await queue.get(item.id);
        if (current.deliveries?.instagram?.status === "publishing") {
          await queue.markFailed(item.id, "instagram", error.message, actor, true);
        }
      } catch { /* Preserve the original error; manual reconciliation is required. */ }
      throw error;
    }
  }
}
