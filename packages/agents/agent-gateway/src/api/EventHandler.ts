import * as http from 'http';
import { Injectable } from '@tsdi/ioc';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';

/**
 * SSE (Server-Sent Events) endpoint — GET /api/events.
 * Mirrors zeroclaw-gateway's SSE event stream.
 */
@Injectable()
export class EventHandler {
    private clients = new Set<http.ServerResponse>();

    private sseHandler: RouteHandler = async (_req, res) => {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        res.write('event: connected\ndata: {}\n\n');

        this.clients.add(res);
        res.on('close', () => this.clients.delete(res));
    };

    /** Broadcast an event to all connected SSE clients */
    broadcast(event: string, data: any): void {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        const dead: http.ServerResponse[] = [];
        for (const client of this.clients) {
            try {
                client.write(payload);
            } catch {
                dead.push(client);
            }
        }
        dead.forEach(c => this.clients.delete(c));
    }

    getRoutes(): GatewayRoute[] {
        const historyHandler: RouteHandler = async (_req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ events: [] }));
        };

        return [
            { method: 'GET', path: '/api/events', handler: this.sseHandler },
            { method: 'GET', path: '/api/events/history', handler: historyHandler }
        ];
    }
}
