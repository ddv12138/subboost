import * as net from "node:net";
import * as tls from "node:tls";

export function measureTCPLatency(
  host: string,
  port: number,
  timeout: number
): Promise<number | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();

    const onDone = (result: number | null) => {
      socket.destroy();
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      onDone(null);
    }, timeout);

    socket.once("error", () => {
      onDone(null);
    });

    socket.connect(port, host, () => {
      const elapsed = Date.now() - start;
      onDone(elapsed);
    });
  });
}

export function measureTLSLatency(
  host: string,
  port: number,
  timeout: number,
  servername?: string
): Promise<number | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = tls.connect({
      host,
      port,
      servername: servername || host,
      rejectUnauthorized: false,
    });

    const onDone = (result: number | null) => {
      socket.destroy();
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      onDone(null);
    }, timeout);

    socket.once("error", () => {
      onDone(null);
    });

    socket.once("secureConnect", () => {
      const elapsed = Date.now() - start;
      onDone(elapsed);
    });
  });
}
