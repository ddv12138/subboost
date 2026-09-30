import { afterEach, describe, expect, it } from "vitest";
import * as dgram from "node:dgram";
import {
  QUIC_PROBE_VERSION,
  buildQUICProbePacket,
  isQUICVersionNegotiationResponse,
  measureQUICLatency,
} from "./quic-latency";

const VN_PACKET = Buffer.concat([
  Buffer.from([0xc0, 0, 0, 0, 0, 8]),
  Buffer.alloc(8),
  Buffer.from([8]),
  Buffer.alloc(8),
]);

const servers: dgram.Socket[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (socket) => new Promise<void>((resolve) => socket.close(() => resolve()))
    )
  );
});

function startUdpServer(
  onMessage: (message: Buffer, rinfo: dgram.RemoteInfo, socket: dgram.Socket) => void
): Promise<number> {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    servers.push(socket);
    socket.on("message", (message, rinfo) => onMessage(message, rinfo, socket));
    socket.bind(0, "127.0.0.1", () => resolve(socket.address().port));
  });
}

describe("buildQUICProbePacket", () => {
  it("builds a 1200-byte QUIC Initial with an unsupported version", () => {
    const packet = buildQUICProbePacket(() => Buffer.alloc(8, 0xab));

    expect(packet).toHaveLength(1200);
    expect(packet[0]).toBe(0xc0);
    expect(packet.readUInt32BE(1)).toBe(QUIC_PROBE_VERSION);
    expect(packet[5]).toBe(8);
    expect(packet.subarray(6, 14)).toEqual(Buffer.alloc(8, 0xab));
    expect(packet[14]).toBe(8);
    expect(packet.subarray(15, 23)).toEqual(Buffer.alloc(8, 0xab));
  });
});

describe("isQUICVersionNegotiationResponse", () => {
  it("accepts a Version Negotiation long-header packet", () => {
    expect(isQUICVersionNegotiationResponse(VN_PACKET)).toBe(true);
  });

  it("rejects short packets, short headers, and non-zero versions", () => {
    expect(isQUICVersionNegotiationResponse(Buffer.from([0xc0, 0, 0, 0]))).toBe(false);
    expect(isQUICVersionNegotiationResponse(Buffer.from([0x40, 0, 0, 0, 0]))).toBe(false);
    expect(isQUICVersionNegotiationResponse(Buffer.from([0xc0, 0, 0, 0, 1]))).toBe(false);
  });
});

describe("measureQUICLatency", () => {
  it("measures RTT when the server replies with Version Negotiation", async () => {
    const port = await startUdpServer((_message, rinfo, socket) => {
      socket.send(VN_PACKET, 0, VN_PACKET.length, rinfo.port, rinfo.address);
    });

    const latency = await measureQUICLatency("127.0.0.1", port, 1000);

    expect(latency).toBeTypeOf("number");
    expect(latency).toBeGreaterThanOrEqual(0);
  });

  it("ignores non-QUIC replies and times out", async () => {
    const port = await startUdpServer((_message, rinfo, socket) => {
      socket.send(Buffer.from("not-quic"), 0, 8, rinfo.port, rinfo.address);
    });

    const latency = await measureQUICLatency("127.0.0.1", port, 150);

    expect(latency).toBeNull();
  });

  it("returns null when the server never replies", async () => {
    const port = await startUdpServer(() => {});

    const latency = await measureQUICLatency("127.0.0.1", port, 150);

    expect(latency).toBeNull();
  });
});
