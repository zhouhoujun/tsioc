import { RequestBase, ResponseBase } from '@tsdi/core';

/**
 * TcpRequest.
 */
export class TcpRequest<T = any> extends RequestBase<T> {

    public readonly id: string;
    public readonly url: string;
    public readonly method: string;
    public readonly params: Record<string, any>;
    public readonly body: T | null;
    /**
    * The expected response type of the server.
    *
    * This is used to parse the response appropriately before returning it to
    * the requestee.
    */
   readonly responseType: 'arraybuffer' | 'blob' | 'json' | 'text';

    private _update: boolean;
    constructor(id: string, option: {
        url: string;
        params?: Record<string, any>;
        method?: string;
        responseType: 'arraybuffer' | 'blob' | 'json' | 'text';
        body?: T;
        update?: boolean;
    }) {
        super();
        this.id = id;
        this.url = option.url;
        this.method = option.method ?? 'EES';
        this.params = option.params ?? {};
        this.body = option.body ?? null;
        this.responseType = option.responseType ?? 'json';
        this._update = option.update === true;
    }

    get isUpdate(): boolean {
        return this._update
    }
}

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

