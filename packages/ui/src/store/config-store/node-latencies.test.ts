import { afterEach, describe, expect, it } from "vitest";
import { useConfigStore } from "../config-store";
import { initialState } from "./definitions";

const node = (name: string, latency: number) => ({
  name, type: "trojan" as const, server: "example.com", port: 443, password: "secret", _meta: { latency },
});
afterEach(() => useConfigStore.setState(structuredClone(initialState)));

describe("partial node latency updates", () => {
  it("preserves skipped node caches and only updates measured nodes", () => {
    const skipped = node("Disabled", 10);
    useConfigStore.setState({ ...structuredClone(initialState), nodes: [skipped, node("Active", 50)] });
    useConfigStore.getState().applyNodeLatencies([{ name: "Active", latency: 20 }]);
    expect(useConfigStore.getState().nodes[0]).toBe(skipped);
    expect(useConfigStore.getState().nodes[1]).toMatchObject({ _meta: { latency: 20 } });
    useConfigStore.getState().applyNodeLatencies([]);
    expect(useConfigStore.getState().nodes[0]).toBe(skipped);
    expect(useConfigStore.getState().nodes[1]).toMatchObject({ _meta: { latency: 20 } });
  });

  it("still clears the latency of explicitly unreachable measured nodes", () => {
    useConfigStore.setState({ ...structuredClone(initialState), nodes: [node("Active", 50)] });
    useConfigStore.getState().applyNodeLatencies([{ name: "Active", latency: null }]);
    expect(useConfigStore.getState().nodes[0]).toMatchObject({ _meta: { latency: undefined } });
  });
});
