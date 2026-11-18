import type { IncomingMessage, ServerResponse } from 'http';
import type { GatewayEventRecord } from './EventHandler';

/** JSON stringify that survives bigint and circular payloads. */
export function stringifyGatewayEvent(value: any): string {
    const seen = new WeakSet<object>();
    return JSON.stringify(value, (_key, current) => {
        if (typeof current === 'bigint') {
            return current.toString();
        }
        if (current && typeof current === 'object') {
            if (seen.has(current)) {
                return '[circular]';
            }
            seen.add(current);
        }
        return current;
    });
}

/**
 * SSE client registry for agent events.
 *
 * Frames carry `id:` so a reconnecting client can pass `Last-Event-ID` and
 * receive the buffered events it missed (session-filtered); the live stream
 * then continues on the same response.
 */
export class GatewayEventStream {
    private readonly clients = new Map<string, Set<ServerResponse>>();

    connect(
        sessionId: string,
        req: Pick<IncomingMessage, 'headers'>,
        res: Pick<ServerResponse, 'write' | 'on'>,
        history: readonly GatewayEventRecord[]
    ): void {
        const headers: any = req.headers || {};
        res.write(`event: connected\ndata: ${JSON.stringify({ sessionId })}\n\n`);
        const lastEventId = String(headers['last-event-id'] ?? headers['Last-Event-ID'] ?? '').trim();
        if (lastEventId) {
            const index = history.findIndex(record => record.id === lastEventId);
            for (const record of index >= 0 ? history.slice(index + 1) : []) {
                if (record.sessionId !== sessionId) {
                    continue;
                }
                try {
                    res.write(`${record.id ? `id: ${record.id}\n` : ''}event: ${record.type}\ndata: ${stringifyGatewayEvent(record)}\n\n`);
                } catch {
                    break;
                }
            }
        }
        const clients = this.clients.get(sessionId) ?? new Set<ServerResponse>();
        clients.add(res as ServerResponse);
        this.clients.set(sessionId, clients);
        res.on('close', () => {
            clients.delete(res as ServerResponse);
            if (!clients.size) {
                this.clients.delete(sessionId);
            }
        });
    }

    broadcast(sessionId: string, event: string, data: any): void {
        const eventId = data && typeof data === 'object' ? String((data as any).id || '').trim() : '';
        const payload = `${eventId ? `id: ${eventId}\n` : ''}event: ${event}\ndata: ${stringifyGatewayEvent(data)}\n\n`;
        const clients = this.clients.get(sessionId);
        if (!clients?.size) {
            return;
        }
        const dead: ServerResponse[] = [];
        for (const client of clients) {
            try {
                client.write(payload);
            } catch {
                dead.push(client);
            }
        }
        for (const client of dead) {
            clients.delete(client);
        }
        if (!clients.size) {
            this.clients.delete(sessionId);
        }
    }
}
