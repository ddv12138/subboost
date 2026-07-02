"use client";

import * as React from "react";
import { Gauge, Loader2, Play, AlertTriangle, CheckCircle2, XCircle, Minus } from "lucide-react";
import { Badge } from "@subboost/ui/components/ui/badge";
import { Button } from "@subboost/ui/components/ui/button";
import { Input } from "@subboost/ui/components/ui/input";
import { Switch } from "@subboost/ui/components/ui/switch";
import { useConfigStore } from "@subboost/ui/store/config-store";
import { SectionHeader } from "../section-header";

type SpeedTestStatus = "idle" | "running" | "done";

function getNodeLatency(node: unknown): number | null | undefined {
  const meta = (node as Record<string, unknown>)._meta as { latency?: number } | undefined;
  if (!meta) return undefined;
  return meta.latency ?? null;
}

export function SpeedTestSection({
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { nodes, speedTest, setSpeedTest, applyNodeLatencies, generateConfig } = useConfigStore();

  const enabledId = React.useId();

  const [status, setStatus] = React.useState<SpeedTestStatus>("idle");
  const [reachable, setReachable] = React.useState(0);
  const [unreachable, setUnreachable] = React.useState(0);
  const [avgLatency, setAvgLatency] = React.useState<number | null>(null);

  const sortedNodes = React.useMemo(() => {
    const withLatency: { node: typeof nodes[number]; latency: number }[] = [];
    const unreachableNodes: typeof nodes = [];
    const untestedNodes: typeof nodes = [];

    for (const node of nodes) {
      const lat = getNodeLatency(node);
      if (lat === undefined) {
        untestedNodes.push(node);
      } else if (lat === null) {
        unreachableNodes.push(node);
      } else {
        withLatency.push({ node, latency: lat });
      }
    }

    withLatency.sort((a, b) => a.latency - b.latency);

    return { sorted: withLatency, unreachable: unreachableNodes, untested: untestedNodes };
  }, [nodes]);

  const maxOutput = speedTest.enabled ? speedTest.maxOutputNodes : nodes.length;

  const handleSpeedTest = React.useCallback(async () => {
    if (nodes.length === 0) return;
    setStatus("running");

    try {
      const response = await fetch("/api/speed-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, speedTest }),
      });

      if (!response.ok) {
        setStatus("idle");
        return;
      }

      const data = await response.json();
      const results: Array<{ name: string; latency: number | null }> = data.results ?? [];

      applyNodeLatencies(results);
      generateConfig();

      const reached = results.filter((r) => r.latency !== null);
      const notReached = results.filter((r) => r.latency === null);
      setReachable(reached.length);
      setUnreachable(notReached.length);

      if (reached.length > 0) {
        const sum = reached.reduce((acc, r) => acc + (r.latency ?? 0), 0);
        setAvgLatency(Math.round(sum / reached.length));
      } else {
        setAvgLatency(null);
      }

      setStatus("done");
    } catch {
      setStatus("idle");
    }
  }, [nodes, speedTest, applyNodeLatencies, generateConfig]);

  const renderNodeRow = (
    index: number,
    node: typeof nodes[number],
    label: "已选" | "已剔除" | "不可达" | "未测速",
    latency: number | null | undefined,
  ) => {
    const latencyMs = latency !== undefined && latency !== null ? `${latency}ms` : "-";
    const labelColor =
      label === "已选" ? "text-green-400" :
      label === "已剔除" ? "text-white/30" :
      label === "不可达" ? "text-red-400" :
      "text-amber-400";

    return (
      <div key={node.name} className="flex items-center gap-2 py-0.5 text-xs">
        <span className="w-5 text-right text-white/20 tabular-nums">{index}.</span>
        <span className="flex-1 truncate text-white/70">{node.name}</span>
        <span className="w-12 text-right text-white/40 tabular-nums font-mono">{latencyMs}</span>
        <span className={`w-10 text-right ${labelColor}`}>{label}</span>
      </div>
    );
  };

  const hasNodes = nodes.length > 0;
  const hasList = sortedNodes.sorted.length > 0 || sortedNodes.unreachable.length > 0 || sortedNodes.untested.length > 0;

  return (
    <div>
      <SectionHeader
        icon={Gauge}
        title="节点测速筛选"
        isExpanded={isExpanded}
        onToggle={onToggle}
        badge={
          speedTest.enabled ? (
            <Badge variant="outline" className="ml-auto border-indigo-500/50 bg-indigo-500/10 text-indigo-300">
              {speedTest.maxOutputNodes} 个/次
            </Badge>
          ) : (
            <Badge variant="outline" className="ml-auto border-white/10 bg-white/5 text-white/40">
              未启用
            </Badge>
          )
        }
      />

      {isExpanded && (
        <div className="mt-2 space-y-3 pl-6">
          <div className="flex items-center justify-between">
            <label htmlFor={enabledId} className="flex items-center gap-2 cursor-pointer select-none text-sm text-white/80">
              启用测速筛选
            </label>
            <Switch
              id={enabledId}
              checked={speedTest.enabled}
              onCheckedChange={(checked) => setSpeedTest({ enabled: checked })}
              aria-label="启用节点测速筛选"
            />
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs text-white/60 mb-1">最大输出节点数</label>
              <Input
                type="number"
                min={1}
                max={200}
                value={speedTest.maxOutputNodes}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1) setSpeedTest({ maxOutputNodes: v });
                }}
                className="text-xs h-8 w-20"
              />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">超时 (ms)</label>
              <Input
                type="number"
                min={100}
                max={30000}
                value={speedTest.timeout}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 100) setSpeedTest({ timeout: v });
                }}
                className="text-xs h-8 w-20"
              />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">并发</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={speedTest.concurrency}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1) setSpeedTest({ concurrency: v });
                }}
                className="text-xs h-8 w-16"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={status === "running" || !hasNodes}
              onClick={handleSpeedTest}
              className="h-8 text-xs"
            >
              {status === "running" ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 mr-1.5" />
              )}
              {status === "running" ? "测速中..." : "开始测速"}
            </Button>

            {status === "done" && (
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {reachable} 可达
                </span>
                {unreachable > 0 && (
                  <span className="flex items-center gap-1 text-red-400">
                    <XCircle className="h-3.5 w-3.5" />
                    {unreachable} 不可达
                  </span>
                )}
                {avgLatency !== null && (
                  <span className="text-white/50">
                    平均 {avgLatency} ms
                  </span>
                )}
              </div>
            )}
          </div>

          {!hasNodes && (
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <AlertTriangle className="h-3 w-3" />
              暂无节点，请先导入
            </div>
          )}

          {hasNodes && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-white/50 font-medium">节点延迟排序</span>
                <span className="text-[10px] text-white/30">（共 {nodes.length} 个）</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5 rounded-md border border-white/10 bg-white/[0.02] p-1.5">
                {sortedNodes.sorted.map(({ node, latency }, i) => (
                  renderNodeRow(
                    i + 1,
                    node,
                    i < maxOutput ? "已选" : "已剔除",
                    latency,
                  )
                ))}
                {sortedNodes.unreachable.length > 0 && (
                  <>
                    <div className="border-t border-white/10 my-1" />
                    {sortedNodes.unreachable.map((node, i) => (
                      renderNodeRow(
                        sortedNodes.sorted.length + 1 + i,
                        node,
                        "不可达",
                        null,
                      )
                    ))}
                  </>
                )}
                {sortedNodes.untested.length > 0 && (
                  <>
                    {(sortedNodes.sorted.length > 0 || sortedNodes.unreachable.length > 0) && (
                      <div className="border-t border-white/10 my-1" />
                    )}
                    {sortedNodes.untested.map((node, i) => (
                      renderNodeRow(
                        sortedNodes.sorted.length + sortedNodes.unreachable.length + 1 + i,
                        node,
                        "未测速",
                        undefined,
                      )
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
