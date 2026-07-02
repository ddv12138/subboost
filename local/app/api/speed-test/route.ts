import { withCurrentAdmin } from "@local/lib/api-auth";
import { apiError, json, readJsonBody } from "@local/lib/http";
import { measureAllNodesLatency } from "@subboost/server-core/speedtest";
import type { ParsedNode } from "@subboost/core/types/node";
import type { SpeedTestConfig } from "@subboost/core/types/config";

export async function POST(request: Request) {
  return withCurrentAdmin(async () => {
    const body = await readJsonBody(request);
    if (!body) return apiError("Invalid JSON body.", "BAD_REQUEST", 400);

    const rawNodes = (body as Record<string, unknown>).nodes;
    const rawSpeedTest = (body as Record<string, unknown>).speedTest;

    if (!Array.isArray(rawNodes)) {
      return apiError("nodes must be an array.", "BAD_REQUEST", 400);
    }

    const nodes = rawNodes.filter(
      (n): n is ParsedNode => Boolean(n) && typeof n === "object" && !Array.isArray(n)
    );

    if (nodes.length === 0) {
      return apiError("No valid nodes provided.", "BAD_REQUEST", 400);
    }

    const rawCfg = typeof rawSpeedTest === "object" && rawSpeedTest !== null
      ? (rawSpeedTest as Record<string, unknown>)
      : {};

    const speedTest: SpeedTestConfig = {
      enabled: true,
      maxOutputNodes: typeof rawCfg.maxOutputNodes === "number" ? rawCfg.maxOutputNodes : 5,
      timeout: typeof rawCfg.timeout === "number" ? rawCfg.timeout : 1000,
      concurrency: typeof rawCfg.concurrency === "number" ? rawCfg.concurrency : 10,
    };

    const testedNodes = await measureAllNodesLatency(nodes, speedTest);

    const results = testedNodes.map((node) => {
      const meta = (node as unknown as Record<string, unknown>)._meta as { latency?: number } | undefined;
      return {
        name: node.name,
        latency: meta && typeof meta.latency === "number" ? meta.latency : null,
      };
    });

    return json({ results });
  });
}
