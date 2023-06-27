import { AbstractAssetContext } from '@tsdi/transport';
import { NatsMicroServiceOpts } from './options';
import { isString } from '@tsdi/ioc';
import { NatsIncoming } from './incoming';
import { NatsOutgoing } from './outgoing';


export class NatsContext extends AbstractAssetContext<NatsIncoming, NatsOutgoing, number, NatsMicroServiceOpts> {
    isAbsoluteUrl(url: string): boolean {
        return abstl.test(url)
    }
    protected parseURL(req: NatsIncoming, proxy?: boolean | undefined): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const baseUrl = isString(this.serverOptions.connectOpts) ? new URL(this.serverOptions.connectOpts)
                : new URL(`${this.serverOptions.connectOpts?.tls ? 'nats' : 'nats'}://${this.serverOptions.connectOpts?.servers ?? 'localhost'}:${this.serverOptions.connectOpts?.port ?? 4222}`);
            const uri = new URL(url, baseUrl);
            return uri;
        }
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
