import { ResponsePacket } from '@tsdi/core';
import { MapHeaders, ResHeaderItemType } from '../../headers';

/**
 * tcp error response.
 */
export class TcpErrorResponse  {
    constructor(readonly status: number, readonly statusMessage: string, readonly error?: any){

    }
}

/**
 * TcpResponse.
 */
export class TcpResponse<T = any> extends MapHeaders<ResHeaderItemType> implements ResponsePacket<T> {
    readonly id: string;
    readonly type: number;
    readonly status: number;
    readonly statusMessage: string;
    readonly body: T | null;

    constructor(options: {
        id?: string;
        type?: number;
        status: number;
        statusMessage?: string;
        body?: T;
    }) {
        super();
        this.id = options.id ?? '';
        this.type = options.type ?? 0;
        this.status = options.status;
        this.statusMessage = options.statusMessage ?? '';
        this.body = options.body ?? null;
    }

    get ok(): boolean {
        return this.status === 200;
    }
}

export type TcpEvent<T = any> = TcpErrorResponse  | TcpResponse<T>;

