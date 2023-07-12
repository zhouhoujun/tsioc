import { AbstractAssetContext } from '@tsdi/transport';
import { NatsMicroServOpts } from './options';
import { EMPTY_OBJ, isString } from '@tsdi/ioc';
import { NatsIncoming } from './incoming';
import { NatsOutgoing } from './outgoing';
import { normalize } from '@tsdi/core';


export class NatsContext extends AbstractAssetContext<NatsIncoming, NatsOutgoing, number, NatsMicroServOpts> {
    isAbsoluteUrl(url: string): boolean {
        return abstl.test(url)
    }
    protected parseURL(req: NatsIncoming, proxy?: boolean | undefined): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const { servers, port } = this.serverOptions.connectOpts ?? EMPTY_OBJ;
            const baseUrl = new URL(`nats://${servers ? (isString(servers) ? servers : servers[0]) : 'localhost'}:${port ?? 4222}`);
            const uri = new URL(url, baseUrl);
            return uri;
        }
    }

    protected override getOriginalUrl(request: NatsIncoming): string {
        return normalize(request.originalUrl);
    }

    override getRequestFilePath() {
        const pathname = this.originalUrl;
        this.mimeAdapter.lookup(pathname);
        return this.mimeAdapter.lookup(pathname) ? pathname : null;
    }

    
    get writable(): boolean {
        return this.response.writable
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

    get secure(): boolean {
        return !!this.serverOptions.connectOpts?.tls
    }

}

const abstl = /^nats:\/\//i;