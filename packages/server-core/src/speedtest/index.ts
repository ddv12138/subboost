import type { ParsedNode } from "@subboost/core/types/node";
import type { SpeedTestConfig } from "@subboost/core/types/config";
import { measureTCPLatency, measureTLSLatency } from "./tcp-latency";
import { measureUDPLatency } from "./udp-latency";
import { isTCPBased, isUDPBased, hasTLS, getSNI } from "./utils";

export { isTCPBased, isUDPBased, hasTLS, getSNI };

async function measureNodeLatency(
  node: ParsedNode,
  timeout: number
): Promise<number | null> {
  const record = node as unknown as Record<string, unknown>;
  const type = String(record.type ?? "");
  const server = String(record.server ?? "");
  const port = Number(record.port ?? 0);

  if (!server || !port || (typeof server !== "string") || (typeof port !== "number" || !Number.isFinite(port))) {
    return null;
  }

  if (isUDPBased(type)) {
    return measureUDPLatency(server, port, timeout);
  }

  if (isTCPBased(type)) {
    if (hasTLS(node)) {
      const sni = getSNI(node, server);
      const tlsResult = await measureTLSLatency(server, port, timeout, sni);
      if (tlsResult !== null) return tlsResult;
      return measureTCPLatency(server, port, timeout);
    }
    return measureTCPLatency(server, port, timeout);
  }

  return null;
}

async function runConcurrent<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency: number
): Promise<void> {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    chunks.push(items.slice(i, i + concurrency));
  }
  for (const chunk of chunks) {
    await Promise.all(chunk.map(fn));
  }
}

export async function measureAllNodesLatency(
  nodes: ParsedNode[],
  config: SpeedTestConfig
): Promise<ParsedNode[]> {
  if (!config.enabled) return nodes;

  const results = new Map<string, number | null>();

  await runConcurrent(nodes, async (node) => {
    const latency = await measureNodeLatency(node, config.timeout);
    results.set(node.name, latency);
  }, config.concurrency);

  return nodes.map((node) => {
    const latency = results.get(node.name) ?? null;
    const record = node as unknown as Record<string, unknown>;
    const existingMeta = record._meta as Record<string, unknown> | undefined;
    return {
      ...node,
      _meta: {
        ...(existingMeta || {}),
        latency: latency ?? undefined,
      },
    } as unknown as ParsedNode;
  });
}
