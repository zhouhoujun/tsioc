import * as http from 'http';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { HttpAuthOptions, HttpAuthService } from '@tsdi/security';
import { AGENT_CHANNEL_OPTIONS } from '../tokens';
import { AgentChannelsOptions, defaultAgentChannelsOptions } from '../options';
import { BaseAgentChannel } from '../contracts/BaseAgentChannel';
import { ChannelCapability } from '../contracts/ChannelCapability';
import { ChannelMessage } from '../contracts/ChannelMessage';
import { SendMessage } from '../contracts/SendMessage';
import { HealthStatus } from '../contracts/HealthStatus';

export interface SSEChannelOptions {
    ssePath?: string;
    messagePath?: string;
    port?: number;
    host?: string;
    auth?: HttpAuthOptions;
}

const defaultOptions: SSEChannelOptions = {
    ssePath: '/sse',
    messagePath: '/sse/message',
    port: 0,
    host: '127.0.0.1'
};

/**
 * Server-Sent Events channel.
 *
 * - Clients connect to GET  {ssePath}  to receive a stream of outbound messages.
 * - External senders POST to {messagePath} to deliver inbound messages.
 *
 * Useful for real-time streaming to web clients.
 * Mirrors the streaming and draft concepts from zeroclaw-channels.
 */
@Injectable()
export class SSEAgentChannel extends BaseAgentChannel {
    private handler?: (message: ChannelMessage) => Promise<void> | void;
    private messageCounter = 0;
    private clients = new Set<http.ServerResponse>();
    private server?: http.Server;
    private options: SSEChannelOptions;
    private httpAuth: HttpAuthService;

    constructor(
        @Optional() @Inject(HttpAuthService) httpAuthOrOptions?: HttpAuthService | SSEChannelOptions,
        @Optional() options?: SSEChannelOptions,
        @Optional() @Inject(AGENT_CHANNEL_OPTIONS) channelOptions: AgentChannelsOptions = defaultAgentChannelsOptions
    ) {
        super();
        const configured = channelOptions.sse ?? {};
        if (httpAuthOrOptions instanceof HttpAuthService) {
            this.httpAuth = httpAuthOrOptions;
            this.options = { ...defaultOptions, ...configured, ...(options ?? {}) };
        } else {
            this.httpAuth = new HttpAuthService();
            this.options = { ...defaultOptions, ...configured, ...(httpAuthOrOptions ?? {}) };
        }
    }

    name(): string {
        return 'sse';
    }

    capabilities(): ChannelCapability[] {
        return ['streaming', 'drafts', 'freeform'];
    }

    supportsFreeFormAsk(): boolean {
        return true;
    }

    supportsDraftUpdates(): boolean {
        return true;
    }

    supportsMultiMessageStreaming(): boolean {
        return true;
    }

    multiMessageDelayMs(): number {
        return 200;
    }

    healthCheck(): Promise<HealthStatus> | HealthStatus {
        return {
            healthy: this.server?.listening ?? false,
            message: this.server?.listening
                ? `listening on port ${(this.server.address() as any)?.port}, clients: ${this.clients.size}`
                : 'not started'
        };
    }

    async listen(handler: (message: ChannelMessage) => Promise<void> | void): Promise<void> {
        this.handler = handler;

        return new Promise<void>((resolve) => {
            this.server = http.createServer((req, res) => {
                const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
                if (req.method === 'GET' && url.pathname === this.options.ssePath) {
                    void this.handleSSEConnection(req, res);
                } else if (req.method === 'POST' && url.pathname === this.options.messagePath) {
                    void this.handleInboundMessage(req, res);
                } else {
                    res.writeHead(404).end();
                }
            });

            this.server.listen(this.options.port, this.options.host, () => resolve());
        });
    }

    private async handleSSEConnection(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        if (!await this.isAuthorized(req)) {
            res.writeHead(401).end('unauthorized');
            return;
        }
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        res.write('event: connected\ndata: {}\n\n');

        this.clients.add(res);
        res.on('close', () => this.clients.delete(res));
    }

    private async handleInboundMessage(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        if (!await this.isAuthorized(req)) {
            res.writeHead(401).end('unauthorized');
            return;
        }
        const body = await this.readBody(req);

        try {
            const payload = JSON.parse(body.toString());
            const message: ChannelMessage = {
                id: `sse-in-${++this.messageCounter}`,
                channel: 'sse',
                sender: payload.sender ?? 'external',
                content: payload.content ?? '',
                timestamp: Date.now(),
                threadId: payload.threadId,
                sessionId: payload.sessionId,
                attachments: payload.attachments,
                metadata: payload.metadata
            };

            res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ status: 'ok', messageId: message.id }));

            await this.handler?.(message);
        } catch (err) {
            res.writeHead(400).end(`invalid payload: ${err}`);
        }
    }

    async send(message: SendMessage): Promise<string> {
        const id = `sse-out-${++this.messageCounter}`;
        const data = JSON.stringify({
            id,
            channel: message.channel,
            recipient: message.recipient,
            content: message.content,
            sessionId: message.sessionId,
            threadId: message.threadId,
            subject: message.subject
        });

        const dead: http.ServerResponse[] = [];
        for (const client of this.clients) {
            try {
                client.write(`event: message\ndata: ${data}\n\n`);
            } catch {
                dead.push(client);
            }
        }
        dead.forEach(c => this.clients.delete(c));

        return id;
    }

    /** Send a draft (edit-in-place) update to all SSE clients */
    async sendDraft?(channel: string, thread: string | undefined, content: string, _partial: boolean): Promise<void> {
        const data = JSON.stringify({
            type: 'draft',
            channel,
            threadId: thread,
            content,
            partial: _partial,
            timestamp: Date.now()
        });
        this.broadcast(`event: draft\ndata: ${data}\n\n`);
    }

    /** Finalize a draft */
    async finalizeDraft?(channel: string, thread: string | undefined, content: string): Promise<void> {
        const data = JSON.stringify({
            type: 'finalize',
            channel,
            threadId: thread,
            content,
            timestamp: Date.now()
        });
        this.broadcast(`event: finalize\ndata: ${data}\n\n`);
    }

    private broadcast(data: string): void {
        const dead: http.ServerResponse[] = [];
        for (const client of this.clients) {
            try {
                client.write(data);
            } catch {
                dead.push(client);
            }
        }
        dead.forEach(c => this.clients.delete(c));
    }

    private async isAuthorized(req: http.IncomingMessage): Promise<boolean> {
        return (await this.httpAuth.authenticate(req, this.options.auth)).authenticated;
    }

    private readBody(req: http.IncomingMessage): Promise<Buffer> {
        return new Promise((resolve) => {
            const chunks: Buffer[] = [];
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    /** Shut down the server */
    close(): Promise<void> {
        return new Promise((resolve) => {
            for (const client of this.clients) {
                client.end();
            }
            this.clients.clear();

            if (this.server?.listening) {
                this.server.close(() => resolve());
            } else {
                resolve();
            }
        });
    }
}
