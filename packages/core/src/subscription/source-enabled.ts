import type { ParsedNode } from "../types/node";
import type { GenerateOptions } from "../generator";
import { getNodeSourceIds } from "./node-source-state";

type SourceState = { id?: string; enabled?: boolean };

/** Missing flags remain enabled for backwards compatibility. Unscoped nodes are retained. */
export function filterEnabledSourceNodes(nodes: ParsedNode[], rawSources: unknown): ParsedNode[] {
  if (!Array.isArray(rawSources)) return nodes;
  const disabledIds = new Set(
    rawSources.filter((source): source is SourceState => Boolean(source) && typeof source === "object")
      .filter((source) => source.enabled === false && typeof source.id === "string")
      .map((source) => source.id!.trim())
  );
  if (disabledIds.size === 0) return nodes;
  return nodes.filter((node) => {
    const ids = getNodeSourceIds(node);
    return ids.length === 0 || ids.some((id) => !disabledIds.has(id));
  });
}

/** Filter output references only; never mutate cached nodes or user settings. */
export function applyEnabledSourcesToGenerateOptions(options: GenerateOptions, sources: unknown): GenerateOptions {
  const nodes = filterEnabledSourceNodes(options.nodes, sources);
  if (nodes === options.nodes) return options;
  const activeNames = new Set(nodes.map((node) => node.name));
  const disabledNames = new Set(options.nodes.filter((node) => !activeNames.has(node.name)).map((node) => node.name));
  return {
    ...options,
    nodes,
    userConfig: {
      ...options.userConfig,
      ...(options.userConfig?.listenerPorts ? {
        listenerPorts: Object.fromEntries(Object.entries(options.userConfig.listenerPorts).filter(([name]) => !disabledNames.has(name))),
      } : {}),
    },
    ...(options.dialerProxyGroups ? {
      dialerProxyGroups: options.dialerProxyGroups.map((group) => ({
        ...group,
        relayNodes: group.relayNodes.filter((name) => !disabledNames.has(name)),
        targetNodes: group.targetNodes.filter((name) => !disabledNames.has(name)),
      })),
    } : {}),
  };
}
