import * as crypto from "node:crypto";
import * as dgram from "node:dgram";

/**
 * QUIC Version Negotiation 测速探针。
 *
 * Hysteria / Hysteria2 / TUIC 都跑在 QUIC(UDP) 之上，服务器不会响应任意 UDP 字节：
 * 旧实现发送 1 字节后必然超时，导致这类节点永远被判为不可达。
 *
 * 这里改为向 QUIC 端口发送一个“长包头 + 不受支持版本号”的 Initial 包，
 * 服务器会回一个 Version Negotiation 包。据此可以在不做握手、不校验证书的
 * 前提下测得真实 UDP RTT。
 */

// 明确不受支持的版本号（GREASE 风格），保证服务器回 Version Negotiation。
export const QUIC_PROBE_VERSION = 0x1a2a3a4a;

// RFC 9000 要求客户端 Initial 报文至少 1200 字节，否则服务器会直接丢弃。
const QUIC_MIN_INITIAL_SIZE = 1200;

export function buildQUICProbePacket(randomBytes: (size: number) => Buffer = crypto.randomBytes): Buffer {
  const packet = Buffer.alloc(QUIC_MIN_INITIAL_SIZE);
  packet[0] = 0xc0; // long header + fixed bit + Initial
  packet.writeUInt32BE(QUIC_PROBE_VERSION, 1);
  packet[5] = 8; // DCID 长度
  randomBytes(8).copy(packet, 6); // DCID
  packet[14] = 8; // SCID 长度
  randomBytes(8).copy(packet, 15); // SCID
  return packet;
}

export function isQUICVersionNegotiationResponse(message: Buffer): boolean {
  if (message.length < 5) return false;
  if ((message[0] & 0x80) === 0) return false; // 必须是长包头
  return message.readUInt32BE(1) === 0; // Version Negotiation 的版本字段为 0
}

export function measureQUICLatency(
  host: string,
  port: number,
  timeout: number
): Promise<number | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = dgram.createSocket("udp4");
    let settled = false;

    const onDone = (result: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        // 套接字可能尚未绑定/已关闭，忽略。
      }
      resolve(result);
    };

    const timer = setTimeout(() => onDone(null), timeout);

    socket.once("error", () => onDone(null));

    socket.on("message", (message) => {
      if (!isQUICVersionNegotiationResponse(message)) return;
      onDone(Date.now() - start);
    });

    const packet = buildQUICProbePacket();
    socket.send(packet, 0, packet.length, port, host, (err) => {
      if (err) onDone(null);
    });
  });
}
