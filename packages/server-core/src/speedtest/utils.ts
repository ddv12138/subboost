import type { ParsedNode } from "@subboost/core/types/node";

const TCP_BASED_TYPES = new Set([
  "ss", "ssr", "vmess", "vless", "trojan", "anytls",
  "http", "https", "socks5", "socks4", "snell", "ssh",
  "relay",
]);

const FORCED_TLS_TYPES = new Set(["trojan", "anytls", "https"]);

export function isTCPBased(type: string): boolean {
  return TCP_BASED_TYPES.has(type);
}

export function isUDPBased(type: string): boolean {
  return type === "hysteria" || type === "hysteria2" || type === "tuic" || type === "wireguard";
}

export function hasTLS(node: ParsedNode): boolean {
  const record = node as unknown as Record<string, unknown>;
  const type = String(record.type ?? "");
  if (FORCED_TLS_TYPES.has(type)) return true;
  return record.tls === true;
}

export function getSNI(node: ParsedNode, defaultHost: string): string {
  const record = node as unknown as Record<string, unknown>;
  const sni = record.sni;
  if (typeof sni === "string" && sni.trim()) return sni.trim();
  const servername = record.servername;
  if (typeof servername === "string" && servername.trim()) return servername.trim();
  return defaultHost;
}
