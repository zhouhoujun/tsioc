import { AbstractAssetContext } from '@tsdi/transport';
import { EMPTY_OBJ } from '@tsdi/ioc';
import * as tls from 'tls';
import { TcpIncoming } from './incoming';
import { TcpOutgoing } from './outgoing';
import { TcpServerOpts } from './options';


export class TcpContext extends AbstractAssetContext<TcpIncoming, TcpOutgoing, number, TcpServerOpts> {

    isAbsoluteUrl(url: string): boolean {
        return tcptl.test(url.trim())
    }

    protected parseURL(req: TcpIncoming, proxy?: boolean | undefined): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const { host, port, path } = this.serverOptions.listenOpts ?? EMPTY_OBJ;
            const protocol = !host && !port ? 'tcp' : this.secure ? 'ssl' : 'tcp';
            const isIPC = !host && !port;
            const baseUrl = isIPC ? new URL(`tcp://${host ?? 'localhost'}`) : new URL(`${protocol}://${host}:${port ?? 3000}`, path);
            const uri = new URL(url, baseUrl);
            return uri;
        }
    }

    get writable(): boolean {
        return this.response.writable
    }

    get secure(): boolean {
        return this.request.socket instanceof tls.TLSSocket;
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

const tcptl = /^(tcp|ssl|ipc):\/\//i;
