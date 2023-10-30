import { AbstractAssetContext, LOCALHOST } from '@tsdi/transport';
import { UdpIncoming } from './incoming';
import { UdpOutgoing } from './outgoing';
import { UdpServerOpts } from './options';
import { udptl } from '../const';


/**
 * UDP server context.
 */
export class UdpContext extends AbstractAssetContext<UdpIncoming, UdpOutgoing, number, UdpServerOpts> {

    isAbsoluteUrl(url: string): boolean {
        return udptl.test(url.trim())
    }

    protected parseURL(req: UdpIncoming, proxy?: boolean | undefined): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const bindOpts = this.serverOptions.bindOpts ?? { port: 3000 };
            const protocol = this.secure ? 'udps' : 'udp';
            const baseUrl = new URL(`${protocol}://${bindOpts.address ?? LOCALHOST}:${bindOpts.port}`);
            const uri = new URL(url, baseUrl);
            return uri;
        }
    }

    get writable(): boolean {
        return this.response.writable
    }

    get secure(): boolean {
        return false; //this.request.socket instanceof tls.TLSSocket;
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

