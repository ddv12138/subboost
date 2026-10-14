import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentAdmin } from "@local/lib/auth";
import { measureAllNodesLatency } from "@subboost/server-core/speedtest";
import { POST } from "../app/api/speed-test/route";

vi.mock("@local/lib/auth", () => ({ getCurrentAdmin: vi.fn() }));
vi.mock("@subboost/server-core/speedtest", () => ({ measureAllNodesLatency: vi.fn() }));

function request(body: unknown) {
  return new Request("http://local.test/api/speed-test", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}
const nodes = [
  { name: "Disabled", _sourceIds: ["off"] },
  { name: "Shared", _sourceIds: ["off", "on"] },
  { name: "Manual" },
];
const sources = [{ id: "off", enabled: false }, { id: "on" }];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentAdmin).mockResolvedValue({ id: "admin-1", username: "root" });
  vi.mocked(measureAllNodesLatency).mockImplementation(async (items) => items.map((node) => ({ ...node, _meta: { latency: 10 } })));
});

describe("speed test source enable control", () => {
  it("excludes disabled nodes while testing shared and unscoped nodes", async () => {
    const response = await POST(request({ nodes, sources, speedTest: { timeout: 500, concurrency: 2 } }));
    expect(response.status).toBe(200);
    expect(measureAllNodesLatency).toHaveBeenCalledWith(nodes.slice(1), expect.objectContaining({ enabled: true, timeout: 500, concurrency: 2 }));
    await expect(response.json()).resolves.toEqual({ results: [{ name: "Shared", latency: 10 }, { name: "Manual", latency: 10 }] });
  });

  it("does not start probing when all nodes are disabled", async () => {
    const response = await POST(request({ nodes: [nodes[0]], sources }));
    expect(response.status).toBe(400);
    expect(measureAllNodesLatency).not.toHaveBeenCalled();
  });

  it("keeps legacy requests without source flags compatible", async () => {
    expect((await POST(request({ nodes }))).status).toBe(200);
    expect(measureAllNodesLatency).toHaveBeenCalledWith(nodes, expect.any(Object));
  });
});
