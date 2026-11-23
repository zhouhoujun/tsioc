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

export interface MqttTlsOptions {
    ca?: string;
    cert?: string;
    key?: string;
    servername?: string;
    rejectUnauthorized?: boolean;
}

export interface MqttConnectOptions {
    url: string;
    clientId?: string;
    username?: string;
    password?: string;
    keepalive?: number;
    /** Clean session flag (default true). */
    clean?: boolean;
    /** Last-will message registered on CONNECT. */
    will?: { topic: string; payload: string; qos?: number; retain?: boolean };
    /** Milliseconds to wait for the broker before failing (default 10000). */
    connectTimeout?: number;
    /** Reject self-signed certificates (mqtts only). */
    rejectUnauthorized?: boolean;
    /** Client certificate / CA options from a TLS config node. */
    tls?: MqttTlsOptions;
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
    const will = options.will?.topic ? options.will : undefined;
    let flags = options.clean === false ? 0 : 0x02;
    if (will) {
        flags |= 0x04;
        flags |= (Math.max(0, Math.min(1, Number(will.qos) || 0)) << 3);
        if (will.retain === true) {
            flags |= 0x20;
        }
    }
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
    if (will) {
        payload.push(encodeString(will.topic));
        payload.push(encodeString(will.payload));
    }
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
                    servername: this.options.tls?.servername || parts.host,
                    rejectUnauthorized: (this.options.tls?.rejectUnauthorized ?? this.options.rejectUnauthorized) !== false,
                    ...(this.options.tls?.ca ? { ca: this.options.tls.ca } : {}),
                    ...(this.options.tls?.cert ? { cert: this.options.tls.cert } : {}),
                    ...(this.options.tls?.key ? { key: this.options.tls.key } : {})
                })
                : net.connect({ host: parts.host, port: parts.port });
            this.socket = socket;
            this.buffer = Buffer.alloc(0);
            const timeoutMs = Math.max(0, Number(this.options.connectTimeout) || 10000);
            const connectTimer = timeoutMs
                ? setTimeout(() => fail(new Error(`MQTT connection timed out after ${timeoutMs}ms (${parts.host}:${parts.port})`)), timeoutMs)
                : undefined;
            const clearConnectTimer = () => {
                if (connectTimer) {
                    clearTimeout(connectTimer);
                }
            };
            const fail = (error: Error) => {
                clearConnectTimer();
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
                        clearConnectTimer();
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

    /** Stop delivering to one handler for a filter. */
    async unsubscribe(topic: string, handler?: (message: MqttMessage) => void): Promise<void> {
        const before = this.subscriptions.length;
        for (let index = this.subscriptions.length - 1; index >= 0; index--) {
            const entry = this.subscriptions[index];
            if (entry.filter !== topic) {
                continue;
            }
            if (handler && entry.handler !== handler) {
                continue;
            }
            this.subscriptions.splice(index, 1);
        }
        if (before === this.subscriptions.length) {
            return;
        }
        const stillUsed = this.subscriptions.some(entry => entry.filter === topic);
        if (!stillUsed && this.socket && !this.socket.destroyed) {
            const packetId = this.packetId();
            this.socket.write(packet(0xa2, Buffer.from([(packetId >> 8) & 0xff, packetId & 0xff]), encodeString(topic)));
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

/**
 * Shared MQTT connections and topic subscriptions.
 *
 * Node-RED keeps one broker connection per config node and fans messages out to
 * every node listening on a topic; this registry does the same: one client per
 * (url, identity, TLS) key, one broker subscription per topic, and handler
 * fan-out. Inbound listeners and outbound publishes therefore share a socket
 * instead of dialing the broker once per node or per run.
 */
export class WorkflowMqttRegistry {
    private readonly subscriptions = new Map<string, Map<string, Set<(message: MqttMessage) => void>>>();

    constructor(private readonly pool: WorkflowMqttPool = new WorkflowMqttPool()) { }

    get connectionCount(): number {
        return this.pool.size;
    }

    /** Use (and lazily connect) the shared client for these options. */
    client(options: MqttConnectOptions): WorkflowMqttClient {
        return this.pool.client(options);
    }

    /** Subscribe once per topic, fanning messages out to every handler. */
    async subscribe(
        options: MqttConnectOptions,
        topic: string,
        qos: 0 | 1,
        handler: (message: MqttMessage) => void
    ): Promise<() => Promise<void>> {
        const client = this.pool.client(options);
        await client.connect();
        const key = mqttPoolKey(options);
        let topics = this.subscriptions.get(key);
        if (!topics) {
            topics = new Map();
            this.subscriptions.set(key, topics);
        }
        let handlers = topics.get(topic);
        if (!handlers) {
            handlers = new Set();
            topics.set(topic, handlers);
            await client.subscribe(topic, qos, message => {
                const listeners = topics!.get(topic);
                if (!listeners) {
                    return;
                }
                for (const listener of [...listeners]) {
                    try {
                        listener(message);
                    } catch {
                        // A throwing node must not break the shared socket.
                    }
                }
            });
        }
        handlers.add(handler);
        return async () => {
            const current = this.subscriptions.get(key)?.get(topic);
            if (!current) {
                return;
            }
            current.delete(handler);
            if (current.size) {
                return;
            }
            this.subscriptions.get(key)?.delete(topic);
            if (!this.subscriptions.get(key)?.size) {
                this.subscriptions.delete(key);
            }
            await client.unsubscribe(topic);
        };
    }

    async publish(options: MqttConnectOptions, message: MqttPublishOptions): Promise<void> {
        await this.pool.client(options).publish(message);
    }

    close(): void {
        this.pool.close();
        this.subscriptions.clear();
    }
}

/** Host transport for `mqtt-out`; closes its client pool with the app. */
@Injectable()
export class WorkflowMqttTransport implements OnDestroy {
    constructor(private readonly registry: WorkflowMqttRegistry = sharedMqttRegistry) { }

    async publish(message: {
        url: string;
        topic: string;
        payload: string;
        qos?: number;
        retain?: boolean;
        clientId?: string;
        username?: string;
        password?: string;
        keepalive?: number;
        clean?: boolean;
        will?: { topic: string; payload: string; qos?: number; retain?: boolean };
        tls?: MqttTlsOptions;
    }): Promise<void> {
        await this.registry.publish({
            url: message.url,
            clientId: message.clientId,
            username: message.username,
            password: message.password,
            keepalive: message.keepalive,
            clean: message.clean,
            will: message.will,
            tls: message.tls
        }, {
            topic: message.topic,
            payload: message.payload,
            qos: Number(message.qos) === 1 ? 1 : 0,
            retain: message.retain === true
        });
    }

    onDestroy(): void {
        this.registry.close();
    }
}

/** Stable key for one shared connection (url + identity + TLS). */
export function mqttPoolKey(options: MqttConnectOptions): string {
    return [
        options.url,
        options.username || '',
        options.password || '',
        options.clientId || '',
        options.clean === false ? 'clean:0' : '',
        options.will ? JSON.stringify(options.will) : '',
        options.tls ? JSON.stringify(options.tls) : ''
    ].join('|');
}

/** Reuse one client per URL/credential pair for outbound publishes. */
export class WorkflowMqttPool {
    private readonly clients = new Map<string, WorkflowMqttClient>();

    get size(): number {
        return this.clients.size;
    }

    client(options: MqttConnectOptions): WorkflowMqttClient {
        const key = mqttPoolKey(options);
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

/** Process-wide registry shared by the inbound runner and outbound nodes. */
export const sharedMqttRegistry = new WorkflowMqttRegistry();
