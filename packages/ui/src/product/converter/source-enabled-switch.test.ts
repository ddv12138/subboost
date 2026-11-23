import { afterEach, describe, expect, it, vi } from "vitest";
import { SourceEnabledSwitch } from "./source-enabled-switch";
import { initialState, type SubscriptionSource } from "@subboost/ui/store/config-store/definitions";
import { useConfigStore } from "@subboost/ui/store/config-store";

const originalParse = useConfigStore.getState().parseSingleSource;
function setup(source: SubscriptionSource) {
  const parseSingleSource = vi.fn().mockResolvedValue(undefined);
  useConfigStore.setState({ ...structuredClone(initialState), sources: [source], parseSingleSource });
  const element = SourceEnabledSwitch({ source });
  const props = element.props.children[0].props;
  return { props, parseSingleSource };
}

afterEach(() => {
  useConfigStore.setState({ ...structuredClone(initialState), parseSingleSource: originalParse });
});

describe("SourceEnabledSwitch", () => {
  it("removes old nodes on disable and reimports a previously parsed source on enable", () => {
    const source: SubscriptionSource = { id: "s", type: "nodes", content: "trojan://secret@example.com:443#Cached", parsed: true };
    const { props, parseSingleSource } = setup(source);
    const cached = { name: "Cached", type: "trojan" as const, server: "example.com", port: 443, password: "secret", _sourceIds: ["s"] };
    useConfigStore.setState({ nodes: [cached], listenerPorts: { Cached: 41000 } });
    useConfigStore.getState().generateConfig();
    expect(useConfigStore.getState().generatedYaml).toContain("Cached");
    expect(props.checked).toBe(true);
    props.onCheckedChange(false);
    expect(useConfigStore.getState().sources[0].enabled).toBe(false);
    expect(useConfigStore.getState().generatedYaml).toBe("");
    expect(useConfigStore.getState().nodes).toEqual([]);
    expect(useConfigStore.getState().listenerPorts).toEqual({ Cached: 41000 });
    expect(parseSingleSource).not.toHaveBeenCalled();
    props.onCheckedChange(true);
    expect(useConfigStore.getState().generatedYaml).toBe("");
    expect(parseSingleSource).toHaveBeenCalledExactlyOnceWith("s");
  });

  it("imports an unparsed source when enabled", () => {
    const { props, parseSingleSource } = setup({ id: "s", type: "nodes", content: "trojan://node", enabled: false, parsed: false });
    expect(props.checked).toBe(false);
    props.onCheckedChange(true);
    expect(parseSingleSource).toHaveBeenCalledWith("s");
  });

  it("reimports changed content, but does not start duplicate work during parsing", () => {
    const source: SubscriptionSource = { id: "s", type: "nodes", content: "new", lastParsedContent: "old", enabled: false, parsed: true };
    const { props, parseSingleSource } = setup(source);
    props.onCheckedChange(true);
    expect(parseSingleSource).toHaveBeenCalledTimes(1);
    useConfigStore.setState((state) => ({ sources: [{ ...state.sources[0], parsing: true }] }));
    props.onCheckedChange(true);
    expect(parseSingleSource).toHaveBeenCalledTimes(1);
  });
});
