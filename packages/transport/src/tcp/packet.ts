import { RequestBase, ResponseBase, TransportContext, UUIDFactory, ServerResponse } from '@tsdi/core';
import { Abstract, EMPTY_OBJ } from '@tsdi/ioc';
import { Buffer } from 'buffer';
import { Socket, NetConnectOpts } from 'net';


export class TCPRequest<T = any> extends RequestBase<T> {

    public readonly id: string;
    public readonly url: string;
    public readonly method: string;
    public readonly socket: Socket;
    public readonly params: Record<string, any>;
    public readonly body: T | null;
    private _update: boolean;
    constructor(public readonly context: TransportContext, option: {
        id?: string;
        url: string;
        socket: Socket;
        params?: Record<string, any>;
        method?: string;
        body?: T;
        update?: boolean;
    }) {
        super();
        this.context.request = this;
        this.id = option.id ?? this.context.resolve(UUIDFactory).generate();
        this.url = option.url;
        this.method = option.method ?? 'EES';
        this.params = option.params ?? {};
        this.socket = option.socket;
        this.body = option.body ?? null;
        this._update = option.update === true;
    }

    isUpdate(): boolean {
        return this._update;
    }
}

export class TCPResponse<T = any> extends ResponseBase<T> {

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


export class TCPServerResponse<T = any> extends ServerResponse<T>  {

    get context(): TransportContext {
        throw new Error('Method not implemented.');
    }
    set status(status: number) {
        throw new Error('Method not implemented.');
    }
    set statusMessage(msg: string) {
        throw new Error('Method not implemented.');
    }
    get contentType(): string {
        throw new Error('Method not implemented.');
    }
    set contentType(type: string) {
        throw new Error('Method not implemented.');
    }
    get sent(): boolean {
        throw new Error('Method not implemented.');
    }
    set ok(ok: boolean) {
        throw new Error('Method not implemented.');
    }
    set body(value: T) {
        throw new Error('Method not implemented.');
    }

    throwError(status: number, message?: string): Error;
    throwError(message: string): Error;
    throwError(error: Error): Error;
    throwError(status: any, message?: any): Error {
        throw new Error('Method not implemented.');
    }

}
