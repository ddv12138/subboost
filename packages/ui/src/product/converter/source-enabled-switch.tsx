"use client";

import { Switch } from "@subboost/ui/components/ui/switch";
import { useConfigStore, type SubscriptionSource } from "@subboost/ui/store/config-store";
import { isSourcePendingImport } from "@subboost/ui/product/subscription/source-import-state";

export function SourceEnabledSwitch({ source }: { source: SubscriptionSource }) {
  const enabled = source.enabled !== false;
  return (
    <label className="inline-flex shrink-0 items-center gap-1.5 text-xs text-white/50">
      <Switch
        checked={enabled}
        aria-label={`启用导入源 ${source.tag || source.id}`}
        onCheckedChange={(checked) => {
          const state = useConfigStore.getState();
          const current = state.sources.find((item) => item.id === source.id);
          if (!current) return;
          const next = { ...current, enabled: checked };
          state.setSources(state.sources.map((item) => item.id === source.id ? next : item));
          if (checked && !next.parsing && isSourcePendingImport(next)) {
            void useConfigStore.getState().parseSingleSource(source.id);
          }
        }}
      />
      {enabled ? "启用" : "已停用"}
    </label>
  );
}
