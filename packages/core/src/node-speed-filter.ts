import type { ParsedNode } from "./types/node";

export function filterNodesByLatency(nodes: ParsedNode[], maxOutputNodes: number): ParsedNode[] {
  const hasLatency = nodes.filter((n) => {
    const meta = (n as unknown as Record<string, unknown>)._meta as { latency?: number } | undefined;
    return meta && typeof meta.latency === "number" && meta.latency >= 0;
  });

  const noLatency = nodes.filter((n) => {
    const meta = (n as unknown as Record<string, unknown>)._meta as { latency?: number } | undefined;
    return !meta || typeof meta.latency !== "number" || meta.latency < 0;
  });

  const sorted = [...hasLatency].sort((a, b) => {
    const la = ((a as unknown as Record<string, unknown>)._meta as { latency?: number })?.latency ?? Infinity;
    const lb = ((b as unknown as Record<string, unknown>)._meta as { latency?: number })?.latency ?? Infinity;
    return la - lb;
  });

  const result = sorted.slice(0, maxOutputNodes);

  const remaining = maxOutputNodes - result.length;
  if (remaining > 0) {
    result.push(...noLatency.slice(0, remaining));
  }

  return result;
}
