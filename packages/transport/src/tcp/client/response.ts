import { ResponseBase } from '@tsdi/core';

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

export type TcpEvent<T = any> = TcpErrorResponse  | TcpResponse<T>;

