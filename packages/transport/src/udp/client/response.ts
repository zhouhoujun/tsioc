import { ResponseHeader, ResponsePacket } from '@tsdi/core';

export class UdpErrorResponse  {
    constructor(readonly status: number, readonly statusMessage: string, readonly error?: any){

    }
}


/**
 * UdpResponse.
 */
export class UdpResponse<T = any> implements ResponsePacket<T>, ResponseHeader {

    readonly type: number;
    readonly status: number;
    readonly statusMessage: string;
    readonly body: T | null;

    constructor(options: {
        type?: number;
        status: number;
        statusMessage?: string;
        body?: T;
    }) {
        this.type = options.type ?? 0;
        this.status = options.status;
        this.statusMessage = options.statusMessage ?? '';
        this.body = options.body ?? null;
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

    get ok(): boolean {
        return this.status === 200;
    }
}

export type UdpEvent<T = any> = UdpErrorResponse | UdpResponse<T>;

