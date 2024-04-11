import { Pattern, TransportHeaders } from '@tsdi/common';
import { Packet } from '../../packet';
import { Incoming } from '../../Incoming';

export class JsonIncoming<T = any> extends Incoming<T> {
    readonly id: any;
    readonly method: string;
    readonly originalUrl: string;
    readonly pattern: Pattern;
    readonly headers: TransportHeaders;
    url: string;
    body: T | null;
    constructor(packet: Packet) {
        super()
        this.headers = new TransportHeaders(packet.headers);
        this.id = packet.id ?? this.headers.getHeader('identity');
        this.method = packet.method ?? this.headers.getHeader('method') ?? '';
        this.url = packet.url ?? this.headers.getHeader('path') ?? '';
        this.originalUrl = this.url.toString();
        this.pattern = packet.pattern ?? this.url;
        this.body = packet.payload ?? null;

    }

    hasContentType(): boolean {
        return this.headers.hasContentType()
    }
    getContentType(): string {
        return this.headers.getContentType()
    }
    protected contentEncoding = 'content-encoding';
    getContentEncoding(): string {
        return this.headers.getHeader(this.contentEncoding) as string
    }

    getContentLength(): number {
        return this.headers.getContentLength()
    }

    hasHeader(field: string): boolean {
        return this.headers.has(field)
    }
    getHeader(field: string): string | null {
        return this.headers.getHeader(field)
    }

    rawBody?: any;
    path?: any;

    getAcceptType?(...contentTypes: string[]): string[] {
        throw new Error('Method not implemented.');
    }
    getAcceptCharset?(...charsets: string[]): string[] {
        throw new Error('Method not implemented.');
    }
    getAcceptEncoding?(...encodings: string[]): string[] {
        throw new Error('Method not implemented.');
    }
    getAcceptLanguage?(...languages: string[]): string[] {
        throw new Error('Method not implemented.');
    }
    getReferrer?(): string {
        throw new Error('Method not implemented.');
    }
    getLocation?(): string {
        throw new Error('Method not implemented.');
    }
}