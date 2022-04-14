import { ResponseBase, TransportContext } from '@tsdi/core';


export class WsResponse<T = any> extends ResponseBase<T>{
    get type(): number {
        throw new Error('Method not implemented.');
    }
    get status(): number {
        throw new Error('Method not implemented.');
    }
    get statusMessage(): string {
        throw new Error('Method not implemented.');
    }
    get ok(): boolean {
        throw new Error('Method not implemented.');
    }
    get body(): T | null {
        throw new Error('Method not implemented.');
    }
}

