import { ResponseBase } from '@tsdi/core';

export class TcpErrorResponse  {
    constructor(readonly status: number, readonly statusMessage: string, readonly error?: any){

    }
}

/**
 * An error that represents a failed attempt to JSON.parse text coming back
 * from the server.
 *
 * It bundles the Error object with the actual response body that failed to parse.
 *
 *
 */
 export interface TcpJsonParseError {
    error: Error;
    text: string;
}


/**
 * TcpResponse.
 */
export class TcpResponse<T = any> extends ResponseBase<T> {

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
        super();
        this.type = options.type ?? 0;
        this.status = options.status;
        this.statusMessage = options.statusMessage ?? '';
        this.body = options.body ?? null;
    }

    get ok(): boolean {
        return this.status === 200;
    }
}

export type TcpEvent<T = any> = TcpErrorResponse | TcpJsonParseError | TcpResponse<T>;

