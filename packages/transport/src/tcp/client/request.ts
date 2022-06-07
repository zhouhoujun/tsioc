import { RequestBase } from '@tsdi/core';

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
