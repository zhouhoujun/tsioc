import { Header, Pattern, TransportHeaders } from '@tsdi/common';
import { Outgoing, Packet } from '@tsdi/common/transport';


export class JsonOutgoing<T = any> implements Outgoing<T> {

    id: any;
    type: number | string | null;
    readonly pattern: Pattern;
    readonly headers: TransportHeaders;
    body: T | null;
    error: any;
    statusCode!: any;
    statusText!: string;
    private _sent = false;
    constructor(packet: Packet) {
        this.headers = new TransportHeaders();
        this.id = packet.id ?? ((packet.headers instanceof TransportHeaders) ? packet.headers?.getHeader('identity') : packet.headers?.['identity'])
        this.type = packet.type ?? null;
        this.pattern = packet.pattern ?? packet.url ?? ((packet.headers instanceof TransportHeaders) ? packet.headers?.getHeader('path') : packet.headers?.['path'] as string) ?? '';
        this.body = null;
    }
    hasContentType(): boolean {
        return this.headers.hasContentType()
    }
    getContentType(): string | null {
        return this.headers.getContentType()
    }
    setContentType(type: string | null | undefined): this {
        this.headers.setContentType(type);
        return this;
    }

    protected contentEncoding = 'content-encoding';
    hasContentEncoding(): boolean {
        return this.headers.has(this.contentEncoding)
    }
    getContentEncoding(): string | null {
        return this.headers.getHeader(this.contentEncoding)
    }
    setContentEncoding(encoding: string | null | undefined): this {
        this.headers.set(this.contentEncoding, encoding);
        return this;
    }
    hasContentLength(): boolean {
        return this.headers.hasContentLength()
    }
    getContentLength(): number | null {
        return this.headers.getContentLength()
    }
    setContentLength(n: number | null | undefined): this {
        this.headers.setContentLength(n);
        return this;
    }

    get sent(): boolean {
        return this.sent;
    }

    hasHeader(field: string): boolean {
        return this.headers.has(field);
    }
    getHeader(field: string): string | number | null {
        return this.headers.getHeader(field)
    }
    setHeader(field: string, val: Header): this {
        this.headers.setHeader(field, val);
        return this;
    }
    removeHeader(field: string): this {
        this.headers.delete(field);
        return this;
    }
    removeHeaders(): this {
        this.headers.removeHeaders();
        return this;
    }
    get writable(): boolean {
        return this.sent
    }

    getLastModified?(): string {
        throw new Error('Method not implemented.');
    }
    setLastModified?(control: string): this {
        throw new Error('Method not implemented.');
    }
    removeLastModified?(): this {
        throw new Error('Method not implemented.');
    }
    getCacheControl?(): string {
        throw new Error('Method not implemented.');
    }
    setCacheControl?(control: string): this {
        throw new Error('Method not implemented.');
    }
    noCache?(): this {
        throw new Error('Method not implemented.');
    }
    setContentDisposition(disposition: string): this {
        throw new Error('Method not implemented.');
    }
    setLocation?(location: string): this {
        throw new Error('Method not implemented.');
    }

}