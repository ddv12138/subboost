import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ store: {} as any, button: {} as any, fetch: vi.fn() }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => [initial, vi.fn()], useEffect: vi.fn(), useId: () => "speed-enabled" };
});
vi.mock("@subboost/ui/store/config-store", () => {
  const useConfigStore = () => mocks.store;
  useConfigStore.getState = () => mocks.store;
  return { useConfigStore };
});
vi.mock("@subboost/ui/components/ui/button", () => ({ Button: (props: any) => { mocks.button = props; return React.createElement("button", { disabled: props.disabled }, props.children); } }));
vi.mock("../section-header", () => ({ SectionHeader: () => null }));

import { SpeedTestSection } from "./speed-test-section";

const nodes = [
  { name: "Disabled", _sourceIds: ["off"], _meta: { latency: 1 } },
  { name: "Active", _sourceIds: ["on"] },
  { name: "Shared", _sourceIds: ["off", "on"] },
];
function render() { return renderToStaticMarkup(React.createElement(SpeedTestSection, { isExpanded: true, onToggle: vi.fn() })); }

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.store = {
    nodes, sources: [{ id: "off", enabled: false }, { id: "on" }],
    speedTest: { enabled: true, maxOutputNodes: 5, timeout: 1000, concurrency: 10 },
    setSpeedTest: vi.fn(), applyNodeLatencies: vi.fn(), generateConfig: vi.fn(),
  };
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ results: [{ name: "Active", latency: 20 }, { name: "Shared", latency: 30 }] }) });
});

afterEach(() => vi.unstubAllGlobals());

describe("SpeedTestSection enabled sources", () => {
  it("shows and sends only enabled nodes, keeping shared nodes", async () => {
    const html = render();
    expect(html).not.toContain("Disabled");
    expect(html).toContain("共 2 个");
    await mocks.button.onClick();
    const body = JSON.parse(mocks.fetch.mock.calls[0][1].body);
    expect(body.nodes).toEqual(nodes.slice(1));
    expect(body.sources).toEqual(mocks.store.sources);
    expect(mocks.store.applyNodeLatencies).toHaveBeenCalledWith([{ name: "Active", latency: 20 }, { name: "Shared", latency: 30 }]);
  });

  it("disables testing when all source nodes are disabled", async () => {
    mocks.store.sources = [{ id: "off", enabled: false }, { id: "on", enabled: false }];
    expect(render()).toContain("暂无启用的节点");
    expect(mocks.button.disabled).toBe(true);
    await mocks.button.onClick();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("does not overwrite caches for nodes disabled during an in-flight test", async () => {
    render();
    mocks.fetch.mockImplementationOnce(async () => {
      mocks.store.sources = [{ id: "off", enabled: false }, { id: "on", enabled: false }];
      return { ok: true, json: async () => ({ results: [{ name: "Active", latency: 20 }, { name: "Shared", latency: 30 }] }) };
    });
    await mocks.button.onClick();
    expect(mocks.store.applyNodeLatencies).toHaveBeenCalledWith([]);
    expect(nodes[0]._meta).toEqual({ latency: 1 });
  });
});
