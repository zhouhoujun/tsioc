import { mths, RequestBase } from '@tsdi/core';

/**
 * TcpRequest.
 */
export class TcpRequest<T = any> extends RequestBase<T> {

    public readonly id: string;
    public url: string;
    public method: 'MESSAGE' | 'EVENT';
    public params: Record<string, any>;
    public body: T | null;

    constructor(id: string, option: {
        url: string;
        params?: Record<string, any>;
        method?: 'MESSAGE' | 'EVENT';
        body?: T;
    }) {
        super();
        this.id = id;
        this.url = option.url;
        this.method = option.method ?? mths.MESSAGE;
        this.params = option.params ?? {};
        this.body = option.body ?? null;
    }

    serialize(): Uint8Array | string {
        throw new Error('Method not implemented.');
    }
}
