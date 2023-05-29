import { ListenOpts } from '@tsdi/core';
import { AbstractAssetContext } from '@tsdi/transport';
import { RedisIncoming } from './incoming';
import { RedisOutgoing } from './outgoing';
import * as tls from 'tls';

export class RedisContext extends AbstractAssetContext<RedisIncoming, RedisOutgoing, number> {
    isAbsoluteUrl(url: string): boolean {
        return redistl.test(url.trim())
    }

    protected parseURL(req: RedisIncoming, proxy?: boolean | undefined): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const { host, port, path } = this.getListenOpts();
            const isIPC = !host && !port;
            const baseUrl = isIPC ? new URL(`redis://${host ?? 'localhost'}`) : new URL(`${this.protocol}://${host}:${port ?? 3000}`, path);
            const uri = new URL(url, baseUrl);
            return uri;
        }
    }

    get writable(): boolean {
        return this.response.writable
    }

    get secure(): boolean {
        return this.request.socket.stream instanceof tls.TLSSocket;
    }

    get protocol(): string {
        return 'redis';
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