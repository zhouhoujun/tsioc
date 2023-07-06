import { Incoming } from '@tsdi/core';
import { EMPTY_OBJ, isNumber } from '@tsdi/ioc';
import { AbstractAssetContext, LOCALHOST } from '@tsdi/transport';
import { IncomingMessage } from 'coap';
import { CoapOutgoing } from './outgoing';
import { CoapServerOpts } from './options';

/**
 * CoAP server context
 */
export class CoapContext extends AbstractAssetContext<IncomingMessage, CoapOutgoing, string, CoapServerOpts> {
    isAbsoluteUrl(url: string): boolean {
        return coaptl.test(url.trim())
    }
    protected parseURL(req: Incoming<any, any>, proxy?: boolean): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const { host, port } = isNumber(this.serverOptions.listenOpts) ? { port: this.serverOptions.listenOpts, host: LOCALHOST } : this.serverOptions.listenOpts ?? EMPTY_OBJ;
            const baseUrl = new URL(`${this.protocol}://${host ?? LOCALHOST}${port ? ':' + port : ''}`);
            const uri = new URL(url, baseUrl);
            return uri;
        }
    }
    get writable(): boolean {
        return !this.response.closed && !this.response.destroyed
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

const coaptl = /^coap(s)?:\/\//i;