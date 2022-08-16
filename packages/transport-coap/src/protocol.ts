import { IncomingPacket, TransportProtocol, RequestPacket } from '@tsdi/core';
import { EMPTY_OBJ, Inject, Injectable } from '@tsdi/ioc';
import { ListenOpts, LISTEN_OPTS } from '@tsdi/platform-server';
import { CoapStatus } from './status';

@Injectable()
export class CoapProtocol extends TransportProtocol {

    private _protocol = 'coap';
    constructor(@Inject(LISTEN_OPTS, { defaultValue: EMPTY_OBJ }) private listenOpts: ListenOpts, readonly status: CoapStatus) {
        super();

    }

    get protocol(): string {
        return this._protocol;
    }

    isEvent(req: RequestPacket<any>): boolean {
        return req.method === 'events';
    }

    isUpdate(incoming: IncomingPacket<any>): boolean {
        return incoming.method === 'put';
    }

    isSecure(req: IncomingPacket<any>): boolean {
        return req.connection?.encrypted === true
    }

    parse(req: IncomingPacket, proxy?: boolean | undefined): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const { host, port, path } = this.listenOpts;
            const baseUrl = new URL(`${this.protocol}://${host}:${port ?? 3000}`, path);
            const uri = new URL(url, baseUrl);
            return uri;
        }

    }

    normlizeUrl(url: string): string {
        if (!this.isAbsoluteUrl(url)) {
            const { host, port, path } = this.listenOpts;
            const urlPrefix = `${this.protocol}://${host ?? 'localhost'}:${port ?? 3000}`;
            const baseUrl = new URL(urlPrefix, path);
            const uri = new URL(url, baseUrl);
            url = uri.toString();
        } else {
            const uri = new URL(url);
            this._protocol = uri.protocol.replace('://', '');
            url = uri.toString();
        }
        return url;
    }

    isAbsoluteUrl(url: string): boolean {
        return coapPfx.test(url.trim())
    }

    match(protocol: string): boolean {
        return protocol === this.protocol;
    }
}


const coapPfx = /^coap:\/\//i;
