import { ResponseHeader, ResponsePacket } from '@tsdi/core';
import { MapHeaders, ResHeaderItemType } from '../../headers';

export class UdpErrorResponse  {
    constructor(readonly status: number, readonly statusMessage: string, readonly error?: any){

    }
}


/**
 * UdpResponse.
 */
export class UdpResponse<T = any> extends MapHeaders<ResHeaderItemType> implements ResponsePacket<T>, ResponseHeader {

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
        super()
        this.type = options.type ?? 0;
        this.status = options.status;
        this.statusMessage = options.statusMessage ?? '';
        this.body = options.body ?? null;
    }

    get ok(): boolean {
        return this.status === 200;
    }
}

export type UdpEvent<T = any> = UdpErrorResponse | UdpResponse<T>;

