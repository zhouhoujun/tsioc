import { ResHeaders, ResHeadersLike, ResponsePacket } from '@tsdi/core';

export class UdpErrorResponse  {
    constructor(readonly status: number, readonly statusMessage: string, readonly error?: any){

    }
}


/**
 * UdpResponse.
 */
export class UdpResponse<T = any> implements ResponsePacket<T> {

    readonly type: number;
    readonly status: number;
    readonly statusMessage: string;
    readonly body: T | null;
    readonly headers: ResHeaders;

    constructor(options: {
        type?: number;
        status: number;
        statusMessage?: string;
        headers?: ResHeadersLike;
        body?: T;
    }) {
        this.type = options.type ?? 0;
        this.status = options.status;
        this.statusMessage = options.statusMessage ?? '';
        this.body = options.body ?? null;
        this.headers = new ResHeaders(options.headers)
    }

    get ok(): boolean {
        return this.status === 200;
    }
}

export type UdpEvent<T = any> = UdpErrorResponse | UdpResponse<T>;

