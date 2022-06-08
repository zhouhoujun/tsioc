import { RequestBase } from '@tsdi/core';
import { EMPTY_OBJ } from '@tsdi/ioc';
import { Socket } from 'net';

export class TcpServRequest extends RequestBase {
    public readonly url: string;
    public readonly method: string;
    public readonly params: Record<string, any>;
    public readonly responseType: 'arraybuffer' | 'blob' | 'json' | 'text';

    body: any;

    private _update: boolean;
    constructor(readonly socket: Socket, option: {
        id?: string,
        url?: string;
        params?: Record<string, any>;
        method?: string;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
        update?: boolean;
    } = EMPTY_OBJ) {
        super();
        this.url = option.url ?? '';
        this.method = option.method ?? 'EES';
        this.params = option.params ?? {};
        this.responseType = option.responseType ?? 'json';
        this._update = option.update === true;
    }

    get isUpdate(): boolean {
        return this._update
    }
}

