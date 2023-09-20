import { AbstractAssetContext, LOCALHOST } from '@tsdi/transport';
import { EMPTY_OBJ } from '@tsdi/ioc';
import * as tls from 'tls';
import { WsIncoming } from './incoming';
import { WsOutgoing } from './outgoing';
import { WsServerOpts } from './options';


/**
 * WS server context.
 */
export class WsContext extends AbstractAssetContext<WsIncoming, WsOutgoing, number, WsServerOpts> {

    isAbsoluteUrl(url: string): boolean {
        return wstl.test(url.trim())
    }

    protected parseURL(req: WsIncoming, proxy?: boolean | undefined): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const { host, port, path } = this.serverOptions.serverOpts ?? EMPTY_OBJ;
            const protocol = this.secure ? 'wss' : 'ws';
            const baseUrl = new URL(`${protocol}://${host ?? LOCALHOST}:${port ?? 3000}`, path);
            const uri = new URL(url, baseUrl);
            return uri;
        }
    }

    get writable(): boolean {
        return this.response.writable
    }

    get secure(): boolean {
        return this.request.socket instanceof tls.TLSSocket;
    }

    get status(): number {
        return this.response.statusCode
    }

    set status(status: number) {
        this._explicitStatus = true;
        this.response.statusCode = status;
        if (this.body && this.vaildator.isEmpty(status)) this.body = null;
    }
    get statusMessage(): string {
        return this.response.statusMessage
    }
    set statusMessage(message: string) {
        this.response.statusMessage = message
    }

}

const wstl = /^(ws|wss):\/\//i;
