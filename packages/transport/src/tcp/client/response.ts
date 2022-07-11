import { ResponsePacket } from '@tsdi/core';
import { hdr } from '../../consts';
import { MapHeaders, ResHeaderItemType } from '../../headers';

/**
 * tcp error response.
 */
export class TcpErrorResponse {
    constructor(readonly status: number, readonly statusMessage: string, readonly error?: any) {

    }
}

/**
 * TcpResponse.
 */
export class TcpResponse<T = any> extends MapHeaders<ResHeaderItemType> implements ResponsePacket<T> {
    readonly id: string;
    readonly body: T | null;

    constructor(options: {
        id?: string;
        headers?: Record<string, ResHeaderItemType>;
        body?: T;
    }) {
        super();
        this.id = options.id ?? '';
        options.headers && this.setHeaders(options.headers);
        this.body = options.body ?? null;
    }

    get status(): number {
        return this.getHeader(hdr.STATUS) as number ?? 0;
    }

    get statusMessage(): string {
        return this.getHeader(hdr.STATUS_MESSAGE) as string;
    }

    get ok(): boolean {
        return this.status === 200;
    }
}

export type TcpEvent<T = any> = TcpErrorResponse | TcpResponse<T>;

