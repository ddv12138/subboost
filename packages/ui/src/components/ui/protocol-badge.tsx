import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@subboost/ui/lib/utils";

const PROTOCOL_BADGE_COLORS: Record<string, string> = {
  ss: "border-blue-200 bg-blue-50 text-blue-700",
  ssr: "border-blue-200 bg-blue-50 text-blue-700",
  vmess: "border-violet-200 bg-violet-50 text-violet-700",
  vless: "border-emerald-200 bg-emerald-50 text-emerald-700",
  trojan: "border-red-200 bg-red-50 text-red-700",
  anytls: "border-teal-200 bg-teal-50 text-teal-700",
  hysteria2: "border-orange-200 bg-orange-50 text-orange-700",
  hy2: "border-orange-200 bg-orange-50 text-orange-700",
  tuic: "border-cyan-200 bg-cyan-50 text-cyan-700",
  socks5: "border-slate-200 bg-slate-50 text-slate-700",
  socks4: "border-slate-200 bg-slate-50 text-slate-700",
  http: "border-amber-200 bg-amber-50 text-amber-700",
  https: "border-amber-200 bg-amber-50 text-amber-700",
  ssh: "border-pink-200 bg-pink-50 text-pink-700",
  relay: "border-violet-200 bg-violet-50 text-violet-700",
};

const DEFAULT_PROTOCOL_BADGE_CLASS = "border-slate-200 bg-slate-50 text-slate-700";

export function getProtocolBadgeClass(type: string | undefined): string {
  const key = (type ?? "").trim().toLowerCase();
  return Object.hasOwn(PROTOCOL_BADGE_COLORS, key) ? PROTOCOL_BADGE_COLORS[key] : DEFAULT_PROTOCOL_BADGE_CLASS;
}

type ProtocolBadgeProps = ComponentPropsWithoutRef<"span"> & {
  type: string | undefined;
};

export function ProtocolBadge({ type, className, ...props }: ProtocolBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-[10px] text-center uppercase whitespace-nowrap",
        getProtocolBadgeClass(type),
        className
      )}
      {...props}
    >
      {type}
    </span>
  );
}
