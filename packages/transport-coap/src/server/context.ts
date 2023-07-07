import { Incoming } from '@tsdi/core';
import { EMPTY_OBJ, isNumber } from '@tsdi/ioc';
import { AbstractAssetContext, LOCALHOST } from '@tsdi/transport';
import { IncomingMessage } from 'coap';
import { CoapOutgoing } from './outgoing';
import { CoapServerOpts } from './options';
import { $coapurl, transforms } from '../trans';

/**
 * CoAP server context
 */
export class CoapContext extends AbstractAssetContext<IncomingMessage, CoapOutgoing, string, CoapServerOpts> {

    isAbsoluteUrl(url: string): boolean {
        return $coapurl.test(url.trim())
    }

    protected parseURL(req: Incoming<any, any>, proxy?: boolean): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const { host, port } = isNumber(this.serverOptions.listenOpts) ? { port: this.serverOptions.listenOpts, host: LOCALHOST } : this.serverOptions.listenOpts ?? EMPTY_OBJ;
            const baseUrl = new URL(`coap://${host ?? LOCALHOST}${port ? ':' + port : ''}`);
            const uri = new URL(url, baseUrl);
            return uri;
        }
    }

    get writable(): boolean {
        return !this.response.closed && !this.response.destroyed
    }

    get status(): string {
        return this.response.statusCode;
    }

    set status(status: string) {
        this._explicitStatus = true;
        this.response.statusCode = status;
        if (this.body && this.vaildator.isEmpty(status)) this.body = null;
    }

    override removeHeaders(): void {
        if (this.sent) return;
        this.response._packet.options = [];
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

    protected override toHeaderName(field: string): string {
        return transforms[field] ?? field;
    }

}
