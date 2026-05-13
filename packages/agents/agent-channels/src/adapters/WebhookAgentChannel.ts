import * as http from 'http';
import * as crypto from 'crypto';
import { Injectable } from '@tsdi/ioc';
import { BaseAgentChannel } from '../contracts/BaseAgentChannel';
import { ChannelCapability } from '../contracts/ChannelCapability';
import { ChannelMessage } from '../contracts/ChannelMessage';
import { SendMessage } from '../contracts/SendMessage';
import { HealthStatus } from '../contracts/HealthStatus';

export interface WebhookChannelOptions {
    path?: string;
    port?: number;
    host?: string;
    secret?: string;
    signatureHeader?: string;
    outgoingUrl?: string;
}

const defaultOptions: WebhookChannelOptions = {
    path: '/webhook',
    port: 0,
    host: '0.0.0.0',
    secret: '',
    signatureHeader: 'x-webhook-signature'
};

/**
 * HTTP Webhook channel — receives inbound messages via POST and sends
 * outbound messages via HTTP POST to a configured URL.
 * Mirrors zeroclaw-channels webhook.rs with HMAC signature verification.
 */
@Injectable()
export class WebhookAgentChannel extends BaseAgentChannel {
    private handler?: (message: ChannelMessage) => Promise<void> | void;
    private messageCounter = 0;
    private server?: http.Server;
    private options: WebhookChannelOptions;

    constructor(options?: WebhookChannelOptions) {
        super();
        this.options = { ...defaultOptions, ...options };
    }

    name(): string {
        return 'webhook';
    }

    capabilities(): ChannelCapability[] {
        return ['files', 'attachments'];
    }

    supportsFreeFormAsk(): boolean {
        return true;
    }

    healthCheck(): Promise<HealthStatus> | HealthStatus {
        return {
            healthy: this.server?.listening ?? false,
            message: this.server?.listening ? `listening on port ${(this.server.address() as any)?.port}` : 'not started'
        };
    }

    async listen(handler: (message: ChannelMessage) => Promise<void> | void): Promise<void> {
        this.handler = handler;

        return new Promise<void>((resolve) => {
            this.server = http.createServer((req, res) => {
                if (req.method !== 'POST') {
                    res.writeHead(405).end();
                    return;
                }
                if (req.url !== this.options.path) {
                    res.writeHead(404).end();
                    return;
                }
                this.handleRequest(req, res);
            });

            this.server.listen(this.options.port, this.options.host, () => {
                resolve();
            });
        });
    }

    private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const body = await this.readBody(req);

        // HMAC verification
        if (this.options.secret) {
            const signature = req.headers[this.options.signatureHeader!.toLowerCase()] as string | undefined;
            if (!signature || !this.verifySignature(body, signature)) {
                res.writeHead(401).end('invalid signature');
                return;
            }
        }

        try {
            const payload = JSON.parse(body.toString());
            const message: ChannelMessage = {
                id: `webhook-${++this.messageCounter}`,
                channel: 'webhook',
                sender: payload.sender ?? 'webhook',
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
        const id = `webhook-out-${++this.messageCounter}`;
        if (this.options.outgoingUrl) {
            try {
                await this.httpPost(this.options.outgoingUrl, JSON.stringify(message));
            } catch {
                // fire-and-forget
            }
        }
        return id;
    }

    private httpPost(url: string, data: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const u = new URL(url);
            const opts: http.RequestOptions = {
                hostname: u.hostname,
                port: u.port,
                path: u.pathname,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
            };
            const req = http.request(opts, (res) => {
                res.resume();
                resolve();
            });
            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    private verifySignature(body: Buffer, signature: string): boolean {
        const computed = crypto.createHmac('sha256', this.options.secret ?? '').update(body).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
    }

    private readBody(req: http.IncomingMessage): Promise<Buffer> {
        return new Promise((resolve) => {
            const chunks: Buffer[] = [];
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    /** Shut down the HTTP server */
    close(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server?.listening) {
                this.server.close(() => resolve());
            } else {
                resolve();
            }
        });
    }
}
