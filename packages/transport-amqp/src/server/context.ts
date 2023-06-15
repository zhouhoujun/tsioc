import { AbstractAssetContext } from '@tsdi/transport';
import { AmqpIncoming } from './incoming';
import { AmqpOutgoing } from './outgoing';
import { AmqpMicroServiceOpts } from './options';
import { isString } from '@tsdi/ioc';


export class AmqpContext extends AbstractAssetContext<AmqpIncoming, AmqpOutgoing, number, AmqpMicroServiceOpts> {

    isAbsoluteUrl(url: string): boolean {
        return abstl.test(url)
    }

    protected parseURL(req: AmqpIncoming, proxy?: boolean | undefined): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const baseUrl = isString(this.serverOptions.connectOpts) ? new URL(this.serverOptions.connectOpts)
                : new URL(`${this.serverOptions.connectOpts?.protocol ?? 'amqp'}://${this.serverOptions.connectOpts?.hostname ?? 'localhost'}:${this.serverOptions.connectOpts?.port ?? 5672}`);
            const uri = new URL(url, baseUrl);
            return uri;
        }
    }

    get writable(): boolean {
        return this.response.writable
    }

    get secure(): boolean {
        return false;
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