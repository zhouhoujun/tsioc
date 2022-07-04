import { RequestHeader, RequestPacket } from '@tsdi/core';


/**
 * UdpRequest.
 */
export class UdpRequest<T = any> implements RequestPacket<T>, RequestHeader {

    public readonly id: string;
    public readonly url: string;
    public readonly method: string;
    public readonly params: Record<string, any>;
    public readonly body: T | null;

    constructor(id: string, option: {
        url: string;
        params?: Record<string, any>;
        method?: string;
        body?: T;
        update?: boolean;
    }) {
        this.id = id;
        this.url = option.url;
        this.method = option.method ?? 'EES';
        this.params = option.params ?? {};
        this.body = option.body ?? null;
    }
    
    getHeaders() {
        throw new Error('Method not implemented.');
    }
    hasHeader(field: string): boolean {
        throw new Error('Method not implemented.');
    }
    getHeader(field: string): string | number | string[] | undefined {
        throw new Error('Method not implemented.');
    }
    setHeader(field: string, val: string | number | string[]): void;
    setHeader(fields: Record<string, string | number | string[]>): void;
    setHeader(field: unknown, val?: unknown): void {
        throw new Error('Method not implemented.');
    }
    removeHeader(field: string): void {
        throw new Error('Method not implemented.');
    }
}
