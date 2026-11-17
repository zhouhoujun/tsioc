import * as net from 'node:net';
import * as tls from 'node:tls';
import { Injectable, OnDestroy } from '@tsdi/ioc';

/**
 * Minimal MQTT 3.1.1 client used by the workflow host.
 *
 * The workflow runtime itself is renderer/host agnostic, so MQTT lives here and
 * is injected: inbound nodes get messages from `WorkflowInboundRunner`, and
 * outbound nodes call the publisher the HTTP server installs.
 */

export interface MqttUrlParts {
    secure: boolean;
    host: string;
    port: number;
}

/** Parse `mqtt://host:port` / `mqtts://host` (defaults 1883 / 8883). */
export function parseMqttUrl(url: string): MqttUrlParts {
    const raw = String(url || '').trim();
    const match = /^(mqtts?|tcp|ssl):\/\/(?:[^@/]+@)?([^/:]+)(?::(\d+))?/i.exec(raw);
    if (!match) {
        throw new Error(`Invalid MQTT URL: ${raw || '(empty)'}. Use mqtt://host:1883 or mqtts://host:8883.`);
    }
    const scheme = match[1].toLowerCase();
    const secure = scheme === 'mqtts' || scheme === 'ssl';
    const port = Number(match[3]) || (secure ? 8883 : 1883);
    return { secure, host: match[2], port };
}

export function encodeVarint(value: number): Buffer {
    const bytes: number[] = [];
    let remaining = Math.max(0, Math.floor(value));
    do {
        let byte = remaining % 128;
        remaining = Math.floor(remaining / 128);
        if (remaining > 0) {
            byte |= 0x80;
        }
        bytes.push(byte);
    } while (remaining > 0);
    return Buffer.from(bytes);
}

export function decodeVarint(buffer: Buffer, offset = 0): { value: number; bytes: number } {
    let multiplier = 1;
    let value = 0;
    let index = offset;
    for (let count = 0; count < 4; count++) {
        if (index >= buffer.length) {
            return { value: 0, bytes: 0 };
        }
        const byte = buffer[index++];
        value += (byte & 0x7f) * multiplier;
        if ((byte & 0x80) === 0) {
            return { value, bytes: index - offset };
        }
        multiplier *= 128;
    }
    return { value: 0, bytes: 0 };
}

function encodeString(value: string): Buffer {
    const body = Buffer.from(String(value ?? ''), 'utf8');
    const head = Buffer.alloc(2);
    head.writeUInt16BE(body.length, 0);
    return Buffer.concat([head, body]);
}

function packet(header: number, ...parts: Buffer[]): Buffer {
    const body = Buffer.concat(parts);
    return Buffer.concat([Buffer.from([header]), encodeVarint(body.length), body]);
}

export interface MqttConnectOptions {
    url: string;
    clientId?: string;
    username?: string;
    password?: string;
    keepalive?: number;
    /** Reject self-signed certificates (mqtts only). */
    rejectUnauthorized?: boolean;
}

export interface MqttPublishOptions {
    topic: string;
    payload: string | Buffer;
    qos?: 0 | 1;
    retain?: boolean;
}

export interface MqttMessage {
    topic: string;
    payload: string;
    qos: number;
    retain: boolean;
}

/** Match an MQTT topic against a filter with `+` and `#` wildcards. */
export function mqttTopicMatches(filter: string, topic: string): boolean {
    const filterParts = String(filter || '').split('/');
    const topicParts = String(topic || '').split('/');
    for (let index = 0; index < filterParts.length; index++) {
        const part = filterParts[index];
        if (part === '#') {
            return true;
        }
        if (index >= topicParts.length) {
            return false;
        }
        if (part !== '+' && part !== topicParts[index]) {
            return false;
        }
    }
    return filterParts.length === topicParts.length;
}

export function connectPacket(options: MqttConnectOptions): Buffer {
    const clientId = options.clientId || `tsdi_${Math.random().toString(36).slice(2, 10)}`;
    const keepalive = Math.max(0, Math.min(65535, Math.floor(options.keepalive ?? 60)));
    const username = options.username ?? '';
    const password = options.password ?? '';
    let flags = 0x02; // clean session
    if (username) {
        flags |= 0x80;
    }
    if (password) {
        flags |= 0x40;
    }
    const variable = Buffer.concat([
        encodeString('MQTT'),
        Buffer.from([4, flags]),
        Buffer.from([(keepalive >> 8) & 0xff, keepalive & 0xff])
    ]);
    const payload: Buffer[] = [encodeString(clientId)];
    if (username) {
        payload.push(encodeString(username));
    }
    if (password) {
        payload.push(encodeString(password));
    }
    return packet(0x10, variable, ...payload);
}

export function publishPacket(options: MqttPublishOptions, packetId = 0): Buffer {
    const qos = Math.max(0, Math.min(1, Number(options.qos) || 0));
    const header = 0x30 | (qos << 1) | (options.retain ? 1 : 0);
    const parts: Buffer[] = [encodeString(options.topic)];
    if (qos > 0) {
        parts.push(Buffer.from([(packetId >> 8) & 0xff, packetId & 0xff]));
    }
    parts.push(Buffer.isBuffer(options.payload) ? options.payload : Buffer.from(String(options.payload ?? ''), 'utf8'));
    return packet(header, ...parts);
}

export function subscribePacket(packetId: number, topic: string, qos = 0): Buffer {
    return packet(
        0x82,
        Buffer.from([(packetId >> 8) & 0xff, packetId & 0xff]),
        encodeString(topic),
        Buffer.from([Math.max(0, Math.min(2, Number(qos) || 0))])
    );
}

export function pubackPacket(packetId: number): Buffer {
    return packet(0x40, Buffer.from([(packetId >> 8) & 0xff, packetId & 0xff]));
}

export function decodePublish(buffer: Buffer): MqttMessage & { packetId?: number } {
    // buffer starts at the fixed header
    const header = buffer[0];
    const length = decodeVarint(buffer, 1);
    const start = 1 + length.bytes;
    const qos = (header >> 1) & 0x03;
    const retain = (header & 0x01) === 1;
    const topicLength = buffer.readUInt16BE(start);
    const topic = buffer.slice(start + 2, start + 2 + topicLength).toString('utf8');
    let offset = start + 2 + topicLength;
    let packetId: number | undefined;
    if (qos > 0) {
        packetId = buffer.readUInt16BE(offset);
        offset += 2;
    }
    return {
        topic,
        payload: buffer.slice(offset, start + length.value).toString('utf8'),
        qos,
        retain,
        packetId
    };
}

interface PendingAck {
    resolve: (packet: Buffer) => void;
    reject: (error: Error) => void;
}

/** One MQTT connection with subscribe/publish helpers. */
export class WorkflowMqttClient {
    private socket?: net.Socket;
    private buffer: Buffer = Buffer.alloc(0);
    private connecting?: Promise<void>;
    private nextPacketId = 1;
    private readonly pending = new Map<number, PendingAck>();
    private readonly subscriptions: Array<{ filter: string; handler: (message: MqttMessage) => void }> = [];
    private keepaliveTimer?: any;
    private closed = false;

    constructor(private readonly options: MqttConnectOptions) { }

    get connected(): boolean {
        return !!this.socket && !this.socket.destroyed;
    }

    /** Connect (or reuse the live connection). */
    async connect(): Promise<void> {
        if (this.connected) {
            return;
        }
        if (this.connecting) {
            return this.connecting;
        }
        this.closed = false;
        this.connecting = this.open().finally(() => {
            this.connecting = undefined;
        });
        return this.connecting;
    }

    private open(): Promise<void> {
        const parts = parseMqttUrl(this.options.url);
        return new Promise<void>((resolve, reject) => {
            const socket = parts.secure
                ? tls.connect({
                    host: parts.host,
                    port: parts.port,
                    servername: parts.host,
                    rejectUnauthorized: this.options.rejectUnauthorized !== false
                })
                : net.connect({ host: parts.host, port: parts.port });
            this.socket = socket;
            this.buffer = Buffer.alloc(0);
            const fail = (error: Error) => {
                this.cleanupSocket();
                reject(error);
            };
            socket.once('error', fail);
            socket.once('close', () => {
                this.cleanupSocket();
                this.failPending(new Error('MQTT connection closed'));
            });
            const onConnect = () => {
                socket.removeListener('error', fail);
                socket.on('data', chunk => this.onData(chunk));
                socket.on('error', () => { /* surfaced through the close handler */ });
                socket.write(connectPacket(this.options));
                this.awaitAck(0).then(
                    () => {
                        this.startKeepalive();
                        void this.resubscribeAll();
                        resolve();
                    },
                    error => fail(error)
                );
            };
            if (parts.secure) {
                socket.once('secureConnect', onConnect);
            } else {
                socket.once('connect', onConnect);
            }
        });
    }

    async subscribe(topic: string, _qos: 0 | 1, handler: (message: MqttMessage) => void): Promise<void> {
        await this.connect();
        if (!this.subscriptions.some(entry => entry.filter === topic)) {
            this.subscriptions.push({ filter: topic, handler });
            await this.sendSubscribe(topic);
        } else {
            // Extra handlers for the same filter still receive messages.
            this.subscriptions.push({ filter: topic, handler });
        }
    }

    async publish(options: MqttPublishOptions): Promise<void> {
        await this.connect();
        const qos = Math.max(0, Math.min(1, Number(options.qos) || 0));
        if (qos === 0) {
            this.socket!.write(publishPacket(options));
            return;
        }
        const packetId = this.packetId();
        const ack = this.awaitAck(packetId);
        this.socket!.write(publishPacket(options, packetId));
        await ack;
    }

    close(): void {
        this.closed = true;
        this.stopKeepalive();
        const socket = this.socket;
        if (socket && !socket.destroyed) {
            try {
                socket.write(packet(0xe0));
            } catch {
                // ignore
            }
            socket.destroy();
        }
        this.cleanupSocket();
        this.failPending(new Error('MQTT client closed'));
    }

    private packetId(): number {
        this.nextPacketId = this.nextPacketId >= 0xffff ? 1 : this.nextPacketId + 1;
        return this.nextPacketId;
    }

    private awaitAck(packetId: number): Promise<Buffer> {
        return new Promise<Buffer>((resolve, reject) => {
            this.pending.set(packetId, { resolve, reject });
            const timer = setTimeout(() => {
                if (this.pending.delete(packetId)) {
                    reject(new Error(`MQTT acknowledgement timed out (packet ${packetId})`));
                }
            }, 15000);
            timer.unref?.();
        });
    }

    /** Re-establish subscriptions after a reconnect (packet ids are new). */
    private async resubscribeAll(): Promise<void> {
        for (const entry of this.subscriptions) {
            try {
                await this.sendSubscribe(entry.filter);
            } catch {
                // A failed resubscribe keeps the filter for the next reconnect.
            }
        }
    }

    private async sendSubscribe(filter: string): Promise<void> {
        const packetId = this.packetId();
        const ack = this.awaitAck(packetId);
        this.socket?.write(subscribePacket(packetId, filter, 1));
        await ack;
    }

    private onData(chunk: Buffer): void {
        this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;
        for (; ;) {
            if (this.buffer.length < 2) {
                return;
            }
            const length = decodeVarint(this.buffer, 1);
            if (!length.bytes) {
                return;
            }
            const total = 1 + length.bytes + length.value;
            if (this.buffer.length < total) {
                return;
            }
            const packetBuffer = this.buffer.slice(0, total);
            this.buffer = this.buffer.slice(total);
            this.handlePacket(packetBuffer);
        }
    }

    private handlePacket(buffer: Buffer): void {
        const type = (buffer[0] >> 4) & 0x0f;
        const length = decodeVarint(buffer, 1);
        const start = 1 + length.bytes;
        switch (type) {
            case 2: { // CONNACK
                const code = buffer[start + 1];
                const pending = this.pending.get(0);
                this.pending.delete(0);
                if (code !== 0) {
                    pending?.reject(new Error(`MQTT connection refused (code ${code})`));
                } else {
                    pending?.resolve(buffer);
                }
                return;
            }
            case 3: { // PUBLISH
                const message = decodePublish(buffer);
                if (message.qos > 0 && message.packetId) {
                    this.socket?.write(pubackPacket(message.packetId));
                }
                this.subscriptions
                    .filter(entry => mqttTopicMatches(entry.filter, message.topic))
                    .forEach(entry => {
                        try {
                            entry.handler(message);
                        } catch {
                            // A throwing subscriber must not break the socket loop.
                        }
                    });
                return;
            }
            case 4: { // PUBACK
                const packetId = buffer.readUInt16BE(start);
                this.pending.get(packetId)?.resolve(buffer);
                this.pending.delete(packetId);
                return;
            }
            case 9: { // SUBACK
                const packetId = buffer.readUInt16BE(start);
                this.pending.get(packetId)?.resolve(buffer);
                this.pending.delete(packetId);
                return;
            }
            case 13: // PINGRESP
                return;
            default:
                return;
        }
    }

    private startKeepalive(): void {
        this.stopKeepalive();
        const seconds = Math.max(0, Math.floor(this.options.keepalive ?? 60));
        if (!seconds) {
            return;
        }
        this.keepaliveTimer = setInterval(() => {
            if (this.socket && !this.socket.destroyed) {
                try {
                    this.socket.write(packet(0xc0));
                } catch {
                    // ignore
                }
            }
        }, Math.max(1000, seconds * 500));
        this.keepaliveTimer.unref?.();
    }

    private stopKeepalive(): void {
        if (this.keepaliveTimer !== undefined) {
            clearInterval(this.keepaliveTimer);
            this.keepaliveTimer = undefined;
        }
    }

    private cleanupSocket(): void {
        this.stopKeepalive();
        this.socket = undefined;
        this.buffer = Buffer.alloc(0);
    }

    private failPending(error: Error): void {
        for (const [, pending] of this.pending) {
            pending.reject(error);
        }
        this.pending.clear();
    }
}

/** Host transport for `mqtt-out`; closes its client pool with the app. */
@Injectable()
export class WorkflowMqttTransport implements OnDestroy {
    private readonly pool = new WorkflowMqttPool();

    async publish(message: {
        url: string;
        topic: string;
        payload: string;
        qos?: number;
        retain?: boolean;
        clientId?: string;
        username?: string;
        password?: string;
    }): Promise<void> {
        const client = this.pool.client({ url: message.url, clientId: message.clientId, username: message.username, password: message.password });
        await client.publish({
            topic: message.topic,
            payload: message.payload,
            qos: Number(message.qos) === 1 ? 1 : 0,
            retain: message.retain === true
        });
    }

    onDestroy(): void {
        this.pool.close();
    }
}

/** Reuse one client per URL/credential pair for outbound publishes. */
export class WorkflowMqttPool {
    private readonly clients = new Map<string, WorkflowMqttClient>();

    client(options: MqttConnectOptions): WorkflowMqttClient {
        const key = [options.url, options.username || '', options.password || '', options.clientId || ''].join('|');
        let client = this.clients.get(key);
        if (!client) {
            client = new WorkflowMqttClient(options);
            this.clients.set(key, client);
        }
        return client;
    }

    close(): void {
        for (const [, client] of this.clients) {
            client.close();
        }
        this.clients.clear();
    }
}
