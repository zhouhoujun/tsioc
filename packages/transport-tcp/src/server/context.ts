import { Incoming, ListenOpts, Outgoing } from '@tsdi/core';
import { AbstractAssetContext } from '@tsdi/transport';
import * as net from 'net';
import * as tls from 'tls';


export class TcpContext extends AbstractAssetContext<Incoming, Outgoing> {

    isAbsoluteUrl(url: string): boolean {
        return tcptl.test(url.trim())
    }

    protected parseURL(req: Incoming<any, any>, listenOpts: ListenOpts, proxy?: boolean | undefined): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const { host, port, path } = listenOpts;
            const isIPC = !host && !port;
            const baseUrl = isIPC ? new URL(`tcp://${host ?? 'localhost'}`) : new URL(`tcp://${host}:${port ?? 3000}`, path);
            const uri = new URL(url, baseUrl);
            if (isIPC) {
                uri.protocol = 'ipc';
            }
            return uri;
        }
    }

    get writable(): boolean {
        return this.response.writable
    }
    
    get secure(): boolean {
        return this.request.socket instanceof tls.TLSSocket;
    }

    get protocol(): string {
        return !this.listenOpts.host && !this.listenOpts.port? 'ipc' : 'tcp'
    }

    get status(): string | number {
        return this.response.statusCode
    }

    set status(status: string | number) {
        this.response.statusCode = status
    }
    get statusMessage(): string {
        return this.response.statusMessage
    }
    set statusMessage(message: string) {
        this.response.statusMessage = message
    }

}

const tcptl = /^(tcp|ssl|ipc):\/\//i;
