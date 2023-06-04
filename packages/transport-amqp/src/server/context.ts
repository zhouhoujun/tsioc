import { Incoming, Outgoing } from '@tsdi/core';
import { AbstractAssetContext } from '@tsdi/transport';


export class AmqpContext extends AbstractAssetContext<Incoming, Outgoing, number> {

    isAbsoluteUrl(url: string): boolean {
        return abstl.test(url)
    }

    protected parseURL(req: Incoming<any, any>, proxy?: boolean | undefined): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const { host, port } = this.getListenOpts() ?? {};
            const baseUrl = new URL(`${this.protocol}://${host ?? 'localhost'}:${port ?? 5672}`);
            const uri = new URL(url, baseUrl);
            return uri;
        }
    }

    get writable(): boolean {
        return this.response.writable
    }

    get secure(): boolean {
        return this.getListenOpts()?.withCredentials === true;
    }

    get protocol(): string {
        return 'amqp';
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


const abstl = /^amqp:\/\//i;