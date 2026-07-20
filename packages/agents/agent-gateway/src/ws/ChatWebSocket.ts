import * as http from 'http';
import * as crypto from 'crypto';
import { Buffer } from 'buffer';
import { Injectable, Optional } from '@tsdi/ioc';
import { AgentRuntime } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { getRequestPrincipalId } from '../auth/AuthMiddleware';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';
import { SessionQueue } from '../auth/SessionQueue';
import { AppRpcServer } from '../app-rpc/AppRpcServer';

const MAGIC_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_WS_MESSAGE_BYTES = 64 * 1024;

/**
 * WebSocket chat handler — /ws/chat.
 * Mirrors zeroclaw-gateway's handle_ws_chat: accepts WebSocket upgrade,
 * reads JSON messages, dispatches to AgentRuntime.runTurn(), sends responses.
 */
@Injectable()
export class ChatWebSocket {
    constructor(
        private runtime: AgentRuntime,
        private owners: SessionOwnerStore,
        private sessionQueue: SessionQueue,
        @Optional() private rpc?: AppRpcServer | null
    ) {
    }

    getRoutes(): GatewayRoute[] {
        const handler: RouteHandler = async (req, res) => {
            const principalId = getRequestPrincipalId(req);
            const sessionId = await this.resolveSessionId(req, principalId, res);
            if (!sessionId) {
                return;
            }
            const socket = await this.upgrade(req, res);
            if (!socket) return;
            await this.handleSocket(socket, sessionId, principalId);
        };

        return [
            { method: 'GET', path: '/ws/chat', handler }
        ];
    }

    private async handleSocket(socket: DuplexSocket, sessionId: string, principalId?: string): Promise<void> {
        let buffer = Buffer.alloc(0);

        socket.on('data', (data: Buffer) => {
            buffer = Buffer.concat([buffer, data] as Uint8Array[]);
            if (buffer.length > MAX_WS_MESSAGE_BYTES) {
                socket.end();
                return;
            }
            buffer = this.processFrames(socket, buffer, sessionId, principalId);
        });

        socket.on('close', () => {
            this.sessionQueue.remove(sessionId);
        });
    }

    private processFrames(socket: DuplexSocket, buffer: Buffer, sessionId: string, principalId?: string): Buffer {
        let remaining = buffer;
        while (true) {
            const result = this.parseFrame(remaining);
            if (!result) {
                return remaining;
            }

            remaining = remaining.subarray(result.totalLength);

            if (result.opcode === 0x08) {
                socket.end();
                return Buffer.alloc(0);
            }

            if (result.opcode === 0x09) {
                this.writeFrame(socket, 0x0A, result.payload);
                continue;
            }

            if (result.opcode !== 0x01) {
                continue;
            }

            this.handleMessage(socket, result.payload.toString(), sessionId, principalId);
        }
    }

    private handleMessage(socket: DuplexSocket, text: string, sessionId: string, principalId?: string): void {
        try {
            const message = JSON.parse(text);
            if (message?.jsonrpc === '2.0' && typeof message?.method === 'string') {
                void this.handleRpcMessage(socket, message, sessionId, principalId);
                return;
            }
            const input = message.content ?? message.input ?? text;
            void this.handleLegacyMessage(socket, sessionId, input, principalId);
        } catch {
            const errorMsg = JSON.stringify({ type: 'error', sessionId, error: 'invalid JSON' });
            this.writeFrame(socket, 0x01, Buffer.from(errorMsg));
        }
    }

    private handleRpcMessage(socket: DuplexSocket, message: any, sessionId: string, principalId?: string): void {
        void this.sessionQueue.enqueue(sessionId, async () => {
            const normalized = this.withDefaultSessionId(message, sessionId);
            if (this.rpc) {
                for await (const response of this.rpc.streamPayload(normalized, { principalId })) {
                    this.writeJson(socket, response);
                }
                return;
            }
            const response = await this.legacyRpcFallback(normalized, sessionId, principalId);
            if (response) {
                this.writeJson(socket, response);
            }
        }).catch((err: any) => {
            this.writeJson(socket, {
                jsonrpc: '2.0',
                id: message?.id ?? null,
                error: {
                    code: -32603,
                    message: err?.message ?? 'internal error'
                }
            });
        });
    }

    private handleLegacyMessage(socket: DuplexSocket, sessionId: string, input: string, principalId?: string): void {
        void this.sessionQueue.enqueue(sessionId, async () => {
            if (this.rpc) {
                const request = {
                    jsonrpc: '2.0' as const,
                    id: `ws-${sessionId}-${Date.now()}`,
                    method: 'run.turn_stream',
                    params: { sessionId, input }
                };
                for await (const payload of this.rpc.streamPayload(request, { principalId })) {
                    if (this.isRpcChunkNotification(payload)) {
                        this.writeJson(socket, {
                            type: 'chunk',
                            chunkType: payload.params?.chunkType,
                            sessionId,
                            content: payload.params?.content,
                            timestamp: Date.now()
                        });
                        continue;
                    }
                    if (this.isRpcResult(payload)) {
                        this.writeJson(socket, {
                            type: 'message',
                            sessionId,
                            content: payload.result?.message?.content ?? '',
                            timestamp: Date.now()
                        });
                        this.writeJson(socket, {
                            type: 'done',
                            sessionId,
                            timestamp: Date.now()
                        });
                        return;
                    }
                    if (this.isRpcError(payload)) {
                        this.writeJson(socket, {
                            type: 'error',
                            sessionId,
                            error: payload.error?.message ?? 'internal error'
                        });
                        return;
                    }
                }
                return;
            }

            let streamDone = false;
            for await (const chunk of this.runtime.runStreamingTurn(sessionId, input)) {
                if (chunk.type === 'done') {
                    streamDone = true;
                    continue;
                }
                this.writeJson(socket, {
                    type: 'chunk',
                    chunkType: chunk.type,
                    sessionId,
                    content: chunk.content,
                    timestamp: Date.now()
                });
            }
            const messages = await this.runtime.getMessages(sessionId);
            const finalMessage = messages[messages.length - 1];
            this.writeJson(socket, {
                type: 'message',
                sessionId,
                content: finalMessage?.content ?? '',
                timestamp: Date.now()
            });
            if (streamDone) {
                this.writeJson(socket, {
                    type: 'done',
                    sessionId,
                    timestamp: Date.now()
                });
            }
        }).catch((err: any) => {
            this.writeJson(socket, {
                type: 'error',
                sessionId,
                error: err?.message ?? 'internal error'
            });
        });
    }

    private withDefaultSessionId(payload: any, sessionId: string): any {
        if (Array.isArray(payload)) {
            return payload.map(item => this.withDefaultSessionId(item, sessionId));
        }
        if (!payload || typeof payload !== 'object') {
            return payload;
        }
        const params = payload.params && typeof payload.params === 'object' && !Array.isArray(payload.params)
            ? payload.params
            : undefined;
        if (!params || params.sessionId || !this.methodSupportsSessionId(payload.method)) {
            return payload;
        }
        return {
            ...payload,
            params: {
                ...params,
                sessionId
            }
        };
    }

    private methodSupportsSessionId(method: string): boolean {
        return new Set([
            'session.messages',
            'session.delete',
            'run.turn',
            'run.turn_stream',
            'tools.activate',
            'tools.invoke',
            'memory.list',
            'memory.put',
            'memory.search',
            'events.history'
        ]).has(method);
    }

    private async legacyRpcFallback(message: any, sessionId: string, principalId?: string): Promise<any> {
        if (message?.method === 'run.turn_stream') {
            const input = message?.params?.input ?? '';
            const requestSessionId = message?.params?.sessionId ?? sessionId;
            let finalMessage = '';
            for await (const chunk of this.runtime.runStreamingTurn(requestSessionId, input)) {
                if (chunk.type === 'text') {
                    finalMessage += chunk.content ?? '';
                }
            }
            return {
                jsonrpc: '2.0',
                id: message?.id ?? null,
                result: {
                    sessionId: requestSessionId,
                    message: {
                        role: 'assistant',
                        content: finalMessage
                    }
                }
            };
        }
        if (message?.method === 'run.turn') {
            const result = await this.runtime.runTurn(message?.params?.sessionId ?? sessionId, message?.params?.input ?? '', principalId);
            return {
                jsonrpc: '2.0',
                id: message?.id ?? null,
                result: {
                    sessionId: result.sessionId,
                    turn: result,
                    message: result.message
                }
            };
        }
        return {
            jsonrpc: '2.0',
            id: message?.id ?? null,
            error: {
                code: -32601,
                message: 'RPC transport is not configured.'
            }
        };
    }

    private isRpcChunkNotification(payload: any): payload is { method: string; params?: any } {
        return payload?.jsonrpc === '2.0' && payload?.method === 'run.turn_stream.chunk';
    }

    private isRpcResult(payload: any): payload is { jsonrpc: '2.0'; id: any; result: any } {
        return payload?.jsonrpc === '2.0' && Object.prototype.hasOwnProperty.call(payload, 'result');
    }

    private isRpcError(payload: any): payload is { jsonrpc: '2.0'; id: any; error: any } {
        return payload?.jsonrpc === '2.0' && Object.prototype.hasOwnProperty.call(payload, 'error');
    }

    private writeJson(socket: DuplexSocket, payload: any): void {
        this.writeFrame(socket, 0x01, Buffer.from(JSON.stringify(payload)));
    }

    private async resolveSessionId(req: http.IncomingMessage, principalId: string | undefined, res: http.ServerResponse): Promise<string | null> {
        const host = req.headers.host ?? 'localhost';
        const url = new URL(req.url ?? '/ws/chat', `http://${host}`);
        const requestedSessionId = url.searchParams.get('sessionId');
        if (requestedSessionId) {
            if (!await this.owners.canResume(requestedSessionId, principalId)) {
                res.writeHead(403, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'forbidden' }));
                return null;
            }
            return requestedSessionId;
        }
        const sessionId = `ws-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        await this.owners.create(sessionId, principalId);
        return sessionId;
    }

    /** WebSocket upgrade handshake */
    private upgrade(req: http.IncomingMessage, res: http.ServerResponse): Promise<DuplexSocket | null> {
        const key = req.headers['sec-websocket-key'] as string;
        if (!key) {
            res.writeHead(400).end('missing sec-websocket-key');
            return Promise.resolve(null);
        }
        const origin = req.headers.origin as string | undefined;
        const host = req.headers.host ?? 'localhost';
        if (origin) {
            const allowedOrigin = `http://${host}`;
            const allowedSecureOrigin = `https://${host}`;
            if (origin !== allowedOrigin && origin !== allowedSecureOrigin) {
                res.writeHead(403).end('forbidden origin');
                return Promise.resolve(null);
            }
        }

        const accept = crypto.createHash('sha1').update(key + MAGIC_GUID).digest('base64');
        res.writeHead(101, {
            'Upgrade': 'websocket',
            'Connection': 'Upgrade',
            'Sec-WebSocket-Accept': accept
        });
        (res as any).end();

        return Promise.resolve(req.socket as unknown as DuplexSocket);
    }

    /** Parse a WebSocket frame from a buffer */
    private parseFrame(buffer: Buffer): FrameResult | null {
        if (buffer.length < 2) return null;
        const opcode = buffer[0] & 0x0F;
        const masked = (buffer[1] & 0x80) !== 0;
        let payloadLength = buffer[1] & 0x7F;
        let offset = 2;

        if (payloadLength === 126) {
            if (buffer.length < 4) return null;
            payloadLength = buffer.readUInt16BE(2);
            offset = 4;
        } else if (payloadLength === 127) {
            if (buffer.length < 10) return null;
            payloadLength = Number(buffer.readBigUInt64BE(2));
            offset = 10;
        }

        const totalLength = offset + (masked ? 4 : 0) + payloadLength;
        if (buffer.length < totalLength) return null;

        let payload: Buffer;
        if (masked) {
            const mask = buffer.subarray(offset, offset + 4);
            payload = Buffer.alloc(payloadLength);
            for (let i = 0; i < payloadLength; i++) {
                payload[i] = buffer[offset + 4 + i] ^ mask[i % 4];
            }
        } else {
            payload = buffer.subarray(offset, offset + payloadLength);
        }

        return { opcode, payload, totalLength };
    }

    /** Write a WebSocket frame */
    private writeFrame(socket: DuplexSocket, opcode: number, payload: Buffer): void {
        const headerBuf = Buffer.alloc(10);
        let offset = 0;
        headerBuf[0] = 0x80 | (opcode & 0x0F);

        if (payload.length < 126) {
            headerBuf[1] = payload.length;
            offset = 2;
        } else if (payload.length < 65536) {
            headerBuf[1] = 126;
            headerBuf.writeUInt16BE(payload.length, 2);
            offset = 4;
        } else {
            headerBuf[1] = 127;
            headerBuf.writeBigUInt64BE(BigInt(payload.length), 2);
            offset = 10;
        }

        socket.write(Buffer.concat([headerBuf.subarray(0, offset), payload]));
    }
}

interface FrameResult {
    opcode: number;
    payload: Buffer;
    totalLength: number;
}

type DuplexSocket = NodeJS.ReadWriteStream & { end(): void };
