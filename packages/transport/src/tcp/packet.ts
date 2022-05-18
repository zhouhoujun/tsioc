import { RequestBase, ResponseBase } from '@tsdi/core';
import { Socket } from 'node:net';


export class TcpRequest<T = any> extends RequestBase<T> {

    public readonly id: string;
    public readonly url: string;
    public readonly method: string;
    public readonly socket: Socket;
    public readonly params: Record<string, any>;
    public readonly body: T | null;
    private _update: boolean;
    constructor(id: string, option: {
        url: string;
        socket: Socket;
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
        this.socket = option.socket;
        this.body = option.body ?? null;
        this._update = option.update === true;
    }

    get isUpdate(): boolean {
        return this._update
    }
}

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
