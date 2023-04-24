import { Incoming, ListenOpts } from '@tsdi/core';
import { AbstractAssetContext } from '@tsdi/transport';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';


export class GrpcContext extends AbstractAssetContext<Http2ServerRequest, Http2ServerResponse> {
    isAbsoluteUrl(url: string): boolean {
        throw new Error('Method not implemented.');
    }
    protected parseURL(req: Http2ServerRequest, listenOpts: ListenOpts, proxy?: boolean | undefined): URL {
        throw new Error('Method not implemented.');
    }
    get writable(): boolean {
        throw new Error('Method not implemented.');
    }
    get secure(): boolean {
        throw new Error('Method not implemented.');
    }
    get protocol(): string {
        throw new Error('Method not implemented.');
    }
    get status(): string | number {
        throw new Error('Method not implemented.');
    }
    set status(status: string | number) {
        throw new Error('Method not implemented.');
    }
    get statusMessage(): string {
        throw new Error('Method not implemented.');
    }
    set statusMessage(message: string) {
        throw new Error('Method not implemented.');
    }

}

