import type { Response } from 'express';

type StreamClient = {
  res: Response;
  pingTimer: NodeJS.Timeout;
};

const clientsByUser = new Map<number, Set<StreamClient>>();

function writeEvent(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function openMessageStream(userId: number, res: Response): () => void {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  writeEvent(res, 'ready', { ok: true });

  const pingTimer = setInterval(() => {
    writeEvent(res, 'ping', { t: Date.now() });
  }, 25000);

  const client: StreamClient = { res, pingTimer };
  const set = clientsByUser.get(userId) ?? new Set<StreamClient>();
  set.add(client);
  clientsByUser.set(userId, set);

  return () => {
    clearInterval(pingTimer);
    const list = clientsByUser.get(userId);
    if (list) {
      list.delete(client);
      if (list.size === 0) {
        clientsByUser.delete(userId);
      }
    }
  };
}

export function emitToUsers(userIds: number[], event: string, payload: unknown): void {
  const data = JSON.stringify(payload);
  for (const userId of userIds) {
    const targets = clientsByUser.get(userId);
    if (!targets) continue;
    for (const client of targets) {
      client.res.write(`event: ${event}\n`);
      client.res.write(`data: ${data}\n\n`);
    }
  }
}
