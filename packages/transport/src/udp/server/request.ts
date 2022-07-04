import { RequestHeader, RequestPacket } from '@tsdi/core';
import { EMPTY_OBJ } from '@tsdi/ioc';

export class UdpServRequest implements RequestPacket, RequestHeader {
    public readonly url: string;
    public readonly method: string;
    public readonly params: Record<string, any>;

    body: any;

    private _update: boolean;
    constructor(option: {
        id?: string,
        url?: string;
        body?: any;
        params?: Record<string, any>;
        method?: string;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
        update?: boolean;
    } = EMPTY_OBJ) {
        this.url = option.url ?? '';
        this.method = option.method ?? 'EES';
        this.body = option.body ?? null;
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

