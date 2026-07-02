import * as dgram from "node:dgram";

export function measureUDPLatency(
  host: string,
  port: number,
  timeout: number
): Promise<number | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = dgram.createSocket("udp4");

    const onDone = (result: number | null) => {
      socket.close();
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      onDone(null);
    }, timeout);

    socket.once("error", () => {
      onDone(null);
    });

    socket.once("message", () => {
      const elapsed = Date.now() - start;
      onDone(elapsed);
    });

    const buf = Buffer.alloc(1);
    buf[0] = 0x00;

    socket.send(buf, 0, buf.length, port, host, (err) => {
      if (err) {
        onDone(null);
      }
    });
  });
}
