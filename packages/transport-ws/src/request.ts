import { RequestBase, TransportContext } from '@tsdi/core';


export class WsRequest<T = any> extends RequestBase<T> {
    
    constructor(readonly url: string, options?: any) {
        super()
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