import { Incoming } from '@tsdi/core';
import { AbstractAssetContext } from '@tsdi/transport';
import { IncomingMessage } from 'coap';
import { CoapOutgoing } from './outgoing';


export class CoapContext extends AbstractAssetContext<IncomingMessage, CoapOutgoing> {
    isAbsoluteUrl(url: string): boolean {
        return coaptl.test(url.trim())
    }
    protected parseURL(req: Incoming<any, any>, proxy?: boolean): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const { host, port, path } = this.getListenOpts();
            const baseUrl = new URL(`${this.protocol}://${host}:${port ?? 3000}`);
            const uri = new URL(url, baseUrl);
            return uri;
        }
    }
    get writable(): boolean {
        return !this.response.response.closed && !this.response.response.destroyed
    }
    get protocol(): string {
        return 'coap';
    }

    get status(): string {
        return this.response.statusCode;
    }
    set status(status: string) {
        this._explicitStatus = true;
        this.response.statusCode = status;
        if (this.body && this.vaildator.isEmpty(status)) this.body = null;
    }

    get statusMessage(): string {
        return this.response.statusMessage ?? '';
    }
    set statusMessage(message: string) {
        this.response.statusMessage = message;
    }
    get secure(): boolean {
        return false
    }

}

const coaptl = /^coap:\/\//i;