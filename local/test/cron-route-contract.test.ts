import { beforeEach, describe, expect, it, vi } from "vitest";

import { withCurrentAdmin } from "@local/lib/api-auth";
import { runLocalSubscriptionAutoUpdate, refreshLocalRuleIndex } from "@local/lib/local-cron-jobs";
import * as updateSubscriptionsRoute from "../app/api/cron/update-subscriptions/route";
import * as updateRuleIndexRoute from "../app/api/cron/update-rule-index/route";

let authenticated = true;

vi.mock("@local/lib/local-cron-jobs", () => ({
  runLocalSubscriptionAutoUpdate: vi.fn(),
  refreshLocalRuleIndex: vi.fn(),
}));

vi.mock("@local/lib/api-auth", () => ({
  withCurrentAdmin: vi.fn(async (handler: (admin: { id: string; username: string }) => Response | Promise<Response>) => {
    if (!authenticated) return Response.json({ error: "Authentication required.", code: "UNAUTHORIZED" }, { status: 401 });
    return handler({ id: "admin-1", username: "admin" });
  }),
}));

function request(path: string): Request {
  return new Request(`http://local.test${path}`, { method: "POST" });
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

beforeEach(() => {
  vi.clearAllMocks();
  authenticated = true;
  vi.mocked(runLocalSubscriptionAutoUpdate).mockResolvedValue({
    results: { total: 0, updated: 0, skipped: 0, failed: 0, errors: [] },
    updatedSubscriptions: [],
    failedSubscriptions: [],
    updatedUsers: [],
    topHosts: [],
  });
  vi.mocked(refreshLocalRuleIndex).mockResolvedValue({
    status: "skipped",
    index: { geosite: [], geoip: [], fetchedAt: 1, expiresAt: 2, source: "remote" },
    diff: {
      fetchedAt: 1,
      totalRemoteRules: 0,
      totalCuratedRules: 0,
      missingCuratedRules: [],
      missingModuleRuleRefs: [],
      duplicateCuratedRuleIds: [],
      unknownCategories: [],
      remoteOnlySample: [],
    },
  });
});

describe("local cron routes", () => {
  it("rejects calls when the administrator is not logged in", async () => {
    authenticated = false;
    const response = await updateSubscriptionsRoute.POST(request("/api/cron/update-subscriptions"));
    expect(response.status).toBe(401);
    expect(await readJson(response)).toEqual({
      error: "Authentication required.",
      code: "UNAUTHORIZED",
    });
    expect(runLocalSubscriptionAutoUpdate).not.toHaveBeenCalled();
  });

  it("runs subscription updates for a logged-in administrator", async () => {
    const response = await updateSubscriptionsRoute.POST(request("/api/cron/update-subscriptions"));
    expect(response.status).toBe(200);
    expect(withCurrentAdmin).toHaveBeenCalledTimes(1);
    expect(runLocalSubscriptionAutoUpdate).toHaveBeenCalledTimes(1);
    expect((await readJson(response)).success).toBe(true);
  });

  it("runs rule-index refresh for a logged-in administrator", async () => {
    const response = await updateRuleIndexRoute.POST(request("/api/cron/update-rule-index"));
    expect(response.status).toBe(200);
    expect(refreshLocalRuleIndex).toHaveBeenCalledWith(false);
    expect((await readJson(response)).success).toBe(true);
  });

  it("preserves the explicit force option for an administrator", async () => {
    await updateRuleIndexRoute.POST(request("/api/cron/update-rule-index?force=1"));
    expect(refreshLocalRuleIndex).toHaveBeenCalledWith(true);
  });
});
