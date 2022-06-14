import { RequestBase } from '@tsdi/core';

/**
 * TcpRequest.
 */
export class TcpRequest<T = any> extends RequestBase<T> {

    public readonly id: string;
    public url: string;
    public method: string;
    public params: Record<string, any>;
    public body: T | null;

    constructor(id: string, option: {
        url: string;
        params?: Record<string, any>;
        method?: string;
        body?: T;
    }) {
        super();
        this.id = id;
        this.url = option.url;
        this.method = option.method ?? 'EES';
        this.params = option.params ?? {};
        this.body = option.body ?? null;
    }
}
