import { AbstractAssetContext } from '@tsdi/transport';
import { RedisIncoming } from './incoming';
import { RedisOutgoing } from './outgoing';
import { RedisServerOpts } from './options';

export class RedisContext extends AbstractAssetContext<RedisIncoming, RedisOutgoing, number, RedisServerOpts> {
    isAbsoluteUrl(url: string): boolean {
        return redistl.test(url.trim())
    }

    protected parseURL(req: RedisIncoming, proxy?: boolean | undefined): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const { host, port } = this.serverOptions.connectOpts!;
            const baseUrl = new URL(`redis://${host}:${port ?? 6379}`);
            const uri = new URL(url, baseUrl);
            return uri;
        }
    }

    get writable(): boolean {
        return this.response.writable
    }

    get secure(): boolean {
        return !!this.serverOptions.connectOpts?.tls;
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

const redistl = /^redis:\/\//i;