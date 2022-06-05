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
    private _update: boolean;
    constructor(id: string, option: {
        url: string;
        params?: Record<string, any>;
        method?: string;
        body?: T;
        update?: boolean;
    }) {
        super();
        this.id = id;
        this.url = option.url;
        this.method = option.method ?? 'EES';
        this.params = option.params ?? {};
        this.body = option.body ?? null;
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
 * TcpResponse.
 */
export class TcpResponse<T = any> extends ResponseBase<T> {

    readonly type: number;
    readonly status: number;
    readonly statusMessage: string;
    readonly body: T | null;

    constructor(options: {
        id?: number;
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
        throw new Error('Method not implemented.');
    }
}
