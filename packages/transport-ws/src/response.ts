import { ResponseBase, TransportContext, WritableResponse } from '@tsdi/core';


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

export class WritableWsResponse<T= any> extends WritableResponse<T> {
    constructor(readonly context: TransportContext) {
        super()
    }

    set status(status: number) {
        throw new Error('Method not implemented.');
    }
    set statusMessage(msg: string) {
        throw new Error('Method not implemented.');
    }
    set ok(ok: boolean) {
        throw new Error('Method not implemented.');
    }
    set body(value: T | null) {
        throw new Error('Method not implemented.');
    }
    get sent(): boolean {
        throw new Error('Method not implemented.');
    }
    throwError(status: number, message?: string): Error;
    throwError(message: string): Error;
    throwError(error: Error): Error;
    throwError(status: any, message?: any): Error {
        throw new Error('Method not implemented.');
    }

}
