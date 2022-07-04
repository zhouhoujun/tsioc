import { RequestHeader, RequestPacket } from '@tsdi/core';
import { EMPTY_OBJ } from '@tsdi/ioc';
import { Socket } from 'net';

export class TcpServRequest implements RequestPacket, RequestHeader {

    public readonly id: string;
    public readonly url: string;
    public readonly method: string;
    public readonly params: Record<string, any>;

    body: any;

    private _update: boolean;
    constructor(readonly socket: Socket, option: {
        id?: string,
        url?: string;
        params?: Record<string, any>;
        method?: string;
        update?: boolean;
    } = EMPTY_OBJ) {
        this.id = option.id ?? '';
        this.url = option.url ?? '';
        this.method = option.method ?? '';
        this.params = option.params ?? {};
        this._update = option.update === true;
    }

    getHeaders() {
        throw new Error('Method not implemented.');
    }
    hasHeader(field: string): boolean {
        throw new Error('Method not implemented.');
    }
    getHeader(field: string): string | number | string[] | undefined {
        throw new Error('Method not implemented.');
    }
    setHeader(field: string, val: string | number | string[]): void;
    setHeader(fields: Record<string, string | number | string[]>): void;
    setHeader(field: unknown, val?: unknown): void {
        throw new Error('Method not implemented.');
    }
    removeHeader(field: string): void {
        throw new Error('Method not implemented.');
    }

    get isUpdate(): boolean {
        return this._update
    }
}

