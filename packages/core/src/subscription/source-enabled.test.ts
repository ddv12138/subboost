import { describe, expect, it } from "vitest";
import type { ParsedNode } from "../types/node";
import { applyEnabledSourcesToGenerateOptions, filterEnabledSourceNodes } from "./source-enabled";
import { buildGenerateOptionsFromConfig } from "./config-utils";
import { buildProxyProvidersFromConfig } from "./proxy-providers";

function node(name: string, ids?: string[]): ParsedNode {
  return { name, type: "trojan", server: "example.com", port: 443, password: "secret", ...(ids ? { _sourceIds: ids } : {}) } as ParsedNode;
}

const sources = [{ id: "off", enabled: false }, { id: "on" }];
const nodes = [node("Disabled", ["off"]), node("Shared", ["off", "on"]), node("Manual")];

describe("source enable control", () => {
  it("keeps shared and unscoped nodes and defaults legacy sources to enabled", () => {
    expect(filterEnabledSourceNodes(nodes, sources).map((n) => n.name)).toEqual(["Shared", "Manual"]);
    expect(filterEnabledSourceNodes(nodes, [{ id: "off" }])).toBe(nodes);
    expect(filterEnabledSourceNodes(nodes, undefined)).toBe(nodes);
    expect(filterEnabledSourceNodes(nodes, null)).toBe(nodes);
  });

  it("filters output references without destroying cached settings", () => {
    const options = {
      nodes,
      userConfig: { listenerPorts: { Disabled: 41000, Shared: 41001 } },
      dialerProxyGroups: [{ id: "d", name: "Relay", relayNodes: ["Disabled", "Shared", "DIRECT"], targetNodes: ["Disabled", "Shared"] }],
    };
    const filtered = applyEnabledSourcesToGenerateOptions(options, sources);
    expect(filtered.nodes).toHaveLength(2);
    expect(filtered.userConfig?.listenerPorts).toEqual({ Shared: 41001 });
    expect(filtered.dialerProxyGroups?.[0]).toMatchObject({ relayNodes: ["Shared", "DIRECT"], targetNodes: ["Shared"] });
    expect(options.nodes).toHaveLength(3);
    expect(options.userConfig.listenerPorts.Disabled).toBe(41000);
    expect(applyEnabledSourcesToGenerateOptions(options, [{ id: "off", enabled: true }])).toBe(options);
  });

  it("applies the same filtering to saved subscription generation", () => {
    const options = buildGenerateOptionsFromConfig({ sources, listenerPorts: { Disabled: 41000, Shared: 41001 } }, { nodes });
    expect(options.nodes.map((n) => n.name)).toEqual(["Shared", "Manual"]);
    expect(options.userConfig?.listenerPorts).toEqual({ Shared: 41001 });
  });

  it("excludes disabled providers without reviving fallback sources", () => {
    const provider = { id: "p", type: "url", content: "https://example.com/sub", useProxyProviders: true };
    const opts = { testUrl: "https://example.com/test", testInterval: 300 };
    expect(buildProxyProvidersFromConfig({ sources: [{ ...provider, enabled: false }] }, opts)).toBeUndefined();
    expect(buildProxyProvidersFromConfig({ sources: [provider] }, opts)).toHaveProperty("url_p");
  });
});
