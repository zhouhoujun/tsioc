import { RequestBase, TransportContext } from '@tsdi/core';


export class WsRequest<T = any> extends RequestBase<T> {
    get context(): TransportContext {
        throw new Error('Method not implemented.');
    }
    get url(): string {
        throw new Error('Method not implemented.');
    }
    get params(): Record<string, any> {
        throw new Error('Method not implemented.');
    }
    get method(): string {
        throw new Error('Method not implemented.');
    }

    get body(): T {
        throw new Error('Method not implemented.');
    }

    isUpdate(): boolean {
        throw new Error('Method not implemented.');
    }
}