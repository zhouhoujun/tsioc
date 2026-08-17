import * as dgram from 'dgram';
import * as os from 'os';
import { Buffer } from 'buffer';
import { Injectable } from '@tsdi/ioc';

const MDNS_PORT = 5353;
const MDNS_ADDRESS = '224.0.0.251';
const TYPE_A = 1;
const TYPE_PTR = 12;
const TYPE_TXT = 16;
const TYPE_AAAA = 28;
const TYPE_SRV = 33;
const CLASS_IN = 1;

export interface MdnsAdvertisementOptions {
    port: number;
    host?: string;
    serviceType?: string;
    domain?: string;
    name?: string;
}

export interface MdnsDiscoveryOptions {
    serviceType?: string;
    domain?: string;
    timeoutMs?: number;
}

export interface MdnsGateway {
    name: string;
    host: string;
    port: number;
    url: string;
    txt: Record<string, string>;
}

interface DnsRecord {
    name: string;
    type: number;
    data: Buffer;
    offset: number;
}

function qualifiedService(serviceType = '_tsdi-agent._tcp', domain = 'local'): string {
    const service = serviceType.trim().replace(/\.+$/, '') || '_tsdi-agent._tcp';
    const suffix = domain.trim().replace(/^\.+|\.+$/g, '') || 'local';
    return service.endsWith(`.${suffix}`) ? service : `${service}.${suffix}`;
}

function encodeName(value: string): Buffer {
    const parts = value.replace(/\.+$/, '').split('.');
    const chunks: Buffer[] = [];
    for (const part of parts) {
        const bytes = Buffer.from(part, 'utf8');
        if (bytes.length > 63) throw new Error(`mDNS label exceeds 63 bytes: ${part}`);
        chunks.push(Buffer.from([bytes.length]), bytes);
    }
    chunks.push(Buffer.from([0]));
    return Buffer.concat(chunks as Uint8Array[]);
}

function decodeName(message: Buffer, start: number): { value: string; next: number } {
    const labels: string[] = [];
    let offset = start;
    let next = start;
    let jumped = false;
    const visited = new Set<number>();
    while (offset < message.length) {
        if (visited.has(offset)) throw new Error('mDNS compression pointer loop');
        visited.add(offset);
        const length = message[offset];
        if ((length & 0xc0) === 0xc0) {
            if (offset + 1 >= message.length) throw new Error('Invalid mDNS pointer');
            if (!jumped) next = offset + 2;
            offset = ((length & 0x3f) << 8) | message[offset + 1];
            jumped = true;
            continue;
        }
        offset += 1;
        if (length === 0) {
            if (!jumped) next = offset;
            break;
        }
        if (offset + length > message.length) throw new Error('Invalid mDNS label');
        labels.push(message.toString('utf8', offset, offset + length));
        offset += length;
        if (!jumped) next = offset;
    }
    return { value: labels.join('.'), next };
}

function record(name: string, type: number, data: Buffer, ttl = 120): Buffer {
    const header = Buffer.alloc(10);
    header.writeUInt16BE(type, 0);
    header.writeUInt16BE(CLASS_IN | 0x8000, 2);
    header.writeUInt32BE(ttl, 4);
    header.writeUInt16BE(data.length, 8);
    return Buffer.concat([encodeName(name), header, data] as Uint8Array[]);
}

function buildQuery(service: string): Buffer {
    const header = Buffer.alloc(12);
    header.writeUInt16BE(1, 4);
    const question = Buffer.alloc(4);
    question.writeUInt16BE(TYPE_PTR, 0);
    question.writeUInt16BE(CLASS_IN, 2);
    return Buffer.concat([header, encodeName(service), question] as Uint8Array[]);
}

function ipv4Bytes(address: string): Buffer | undefined {
    const parts = address.split('.').map(Number);
    return parts.length === 4 && parts.every(part => Number.isInteger(part) && part >= 0 && part <= 255)
        ? Buffer.from(parts)
        : undefined;
}

function buildAnnouncement(options: MdnsAdvertisementOptions): Buffer {
    const service = qualifiedService(options.serviceType, options.domain);
    const domain = options.domain?.replace(/^\.+|\.+$/g, '') || 'local';
    const hostname = `${os.hostname().replace(/[^a-zA-Z0-9-]/g, '-') || 'tsdi-agent'}.${domain}`;
    const instance = `${(options.name || os.hostname() || 'TSDI Agent').replace(/\./g, '-')}.${service}`;
    const srv = Buffer.alloc(6);
    srv.writeUInt16BE(options.port, 4);
    const txtValue = Buffer.from('path=/rpc', 'utf8');
    const txt = Buffer.concat([Buffer.from([txtValue.length]), txtValue] as Uint8Array[]);
    const records = [
        record(service, TYPE_PTR, encodeName(instance)),
        record(instance, TYPE_SRV, Buffer.concat([srv, encodeName(hostname)] as Uint8Array[])),
        record(instance, TYPE_TXT, txt)
    ];
    const address = ipv4Bytes(options.host || '') || localIpv4();
    if (address) records.push(record(hostname, TYPE_A, address));
    const header = Buffer.alloc(12);
    header.writeUInt16BE(0x8400, 2);
    header.writeUInt16BE(records.length, 6);
    return Buffer.concat([header, ...records] as Uint8Array[]);
}

function localIpv4(): Buffer | undefined {
    for (const addresses of Object.values(os.networkInterfaces())) {
        const address = addresses?.find(item => item.family === 'IPv4' && !item.internal)?.address;
        if (address) return ipv4Bytes(address);
    }
    return ipv4Bytes('127.0.0.1');
}

function parseRecords(message: Buffer): DnsRecord[] {
    if (message.length < 12) return [];
    let offset = 12;
    const questions = message.readUInt16BE(4);
    const count = message.readUInt16BE(6) + message.readUInt16BE(8) + message.readUInt16BE(10);
    for (let index = 0; index < questions; index++) {
        offset = decodeName(message, offset).next + 4;
        if (offset > message.length) return [];
    }
    const records: DnsRecord[] = [];
    for (let index = 0; index < count && offset < message.length; index++) {
        const decoded = decodeName(message, offset);
        offset = decoded.next;
        if (offset + 10 > message.length) break;
        const type = message.readUInt16BE(offset);
        const length = message.readUInt16BE(offset + 8);
        const dataOffset = offset + 10;
        if (dataOffset + length > message.length) break;
        records.push({ name: decoded.value, type, data: message.slice(dataOffset, dataOffset + length), offset: dataOffset });
        offset = dataOffset + length;
    }
    return records;
}

function questionNames(message: Buffer): string[] {
    if (message.length < 12) return [];
    const names: string[] = [];
    let offset = 12;
    for (let index = 0; index < message.readUInt16BE(4); index++) {
        const decoded = decodeName(message, offset);
        names.push(decoded.value);
        offset = decoded.next + 4;
        if (offset > message.length) break;
    }
    return names;
}

function decodeRecordName(message: Buffer, record: DnsRecord, relativeOffset = 0): string {
    return decodeName(message, record.offset + relativeOffset).value;
}

function parseTxt(data: Buffer): Record<string, string> {
    const result: Record<string, string> = {};
    for (let offset = 0; offset < data.length;) {
        const length = data[offset++];
        const item = data.toString('utf8', offset, offset + length);
        offset += length;
        const separator = item.indexOf('=');
        result[separator < 0 ? item : item.slice(0, separator)] = separator < 0 ? '' : item.slice(separator + 1);
    }
    return result;
}

function gatewaysFromMessage(message: Buffer, sourceAddress: string, service: string): MdnsGateway[] {
    const records = parseRecords(message);
    const instances = records.filter(item => item.type === TYPE_PTR && item.name.toLowerCase() === service.toLowerCase())
        .map(item => decodeRecordName(message, item));
    const addresses = new Map<string, string>();
    for (const item of records) {
        if (item.type === TYPE_A && item.data.length === 4) addresses.set(item.name, [...item.data].join('.'));
        if (item.type === TYPE_AAAA && item.data.length === 16) {
            const parts: string[] = [];
            for (let offset = 0; offset < 16; offset += 2) parts.push(item.data.readUInt16BE(offset).toString(16));
            addresses.set(item.name, parts.join(':'));
        }
    }
    return instances.flatMap(instance => {
        const srv = records.find(item => item.type === TYPE_SRV && item.name === instance);
        if (!srv || srv.data.length < 7) return [];
        const port = srv.data.readUInt16BE(4);
        const target = decodeRecordName(message, srv, 6);
        const host = addresses.get(target) || sourceAddress;
        const txtRecord = records.find(item => item.type === TYPE_TXT && item.name === instance);
        const urlHost = host.includes(':') ? `[${host}]` : host;
        return [{ name: instance.slice(0, -(service.length + 1)), host, port, url: `http://${urlHost}:${port}`, txt: txtRecord ? parseTxt(txtRecord.data) : {} }];
    });
}

@Injectable()
export class MdnsServiceDiscovery {
    private socket?: dgram.Socket;
    private announcement?: Buffer;
    private service?: string;

    async advertise(options: MdnsAdvertisementOptions): Promise<void> {
        if (this.socket) return;
        this.service = qualifiedService(options.serviceType, options.domain);
        this.announcement = buildAnnouncement(options);
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        this.socket = socket;
        socket.on('message', message => {
            try {
                if (questionNames(message).some(name => name.toLowerCase() === this.service!.toLowerCase())) this.sendAnnouncement();
            } catch { /* ignore malformed multicast packets */ }
        });
        await new Promise<void>((resolve, reject) => {
            socket.once('error', reject);
            socket.bind(MDNS_PORT, () => {
                socket.removeListener('error', reject);
                try { socket.addMembership(MDNS_ADDRESS); } catch { /* multicast may be unavailable in containers */ }
                resolve();
            });
        });
        this.sendAnnouncement();
    }

    async stop(): Promise<void> {
        const socket = this.socket;
        this.socket = undefined;
        if (!socket) return;
        await new Promise<void>(resolve => socket.close(() => resolve()));
    }

    async discover(options: MdnsDiscoveryOptions = {}): Promise<MdnsGateway[]> {
        const service = qualifiedService(options.serviceType, options.domain);
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        const found = new Map<string, MdnsGateway>();
        socket.on('message', (message, remote) => {
            try {
                for (const gateway of gatewaysFromMessage(message, remote.address, service)) found.set(gateway.url, gateway);
            } catch { /* ignore malformed multicast packets */ }
        });
        await new Promise<void>((resolve, reject) => {
            socket.once('error', reject);
            socket.bind(0, () => {
                socket.removeListener('error', reject);
                socket.send(buildQuery(service), MDNS_PORT, MDNS_ADDRESS, error => error ? reject(error) : resolve());
            });
        });
        await new Promise<void>(resolve => setTimeout(resolve, Math.max(1, options.timeoutMs ?? 1000)));
        await new Promise<void>(resolve => socket.close(() => resolve()));
        return [...found.values()];
    }

    private sendAnnouncement(): void {
        if (!this.socket || !this.announcement) return;
        this.socket.send(this.announcement, MDNS_PORT, MDNS_ADDRESS, () => undefined);
    }
}

export const mdnsInternals = { qualifiedService, buildQuery, buildAnnouncement, gatewaysFromMessage, questionNames };
