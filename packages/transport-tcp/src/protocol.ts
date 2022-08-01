import { IncomingPacket, Protocol, RequestPacket } from '@tsdi/core';
import { EMPTY_OBJ, Inject, Injectable } from '@tsdi/ioc';
import { ListenOpts, LISTEN_OPTS } from '@tsdi/platform-server';
import { TcpStatus } from './status';

@Injectable()
export class TcpProtocol extends Protocol {


    private _name = 'tcp';
    constructor(@Inject(LISTEN_OPTS, { defaultValue: EMPTY_OBJ }) private listenOpts: ListenOpts, readonly status: TcpStatus) {
        super();

    }

    isEvent(req: RequestPacket<any>): boolean {
        return req.method === 'events';
    }

    /**
     * Short-hand for:
     *
     *    this.protocol == 'https'
     *
     * @return {Boolean}
     * @api public
     */
    get secure(): boolean {
        return this.name === 'tsl'
    }

    get name(): string {
        return this._name;
    }

    parse(req: IncomingPacket, proxy?: boolean | undefined): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const { host, port, path } = this.listenOpts;
            const isIPC = !host && !port;
            if (isIPC) {
                this._name = 'ipc'
            }
            const baseUrl = isIPC ? new URL(`tcp://${host ?? 'localhost'}`) : new URL(`${this.name}://${host}:${port ?? 3000}`, path);
            const uri = new URL(url, baseUrl);
            if (isIPC) {
                uri.protocol = 'ipc';
            }
            return uri;
        }

    }

    normlizeUrl(url: string): string {
        if (!this.isAbsoluteUrl(url)) {
            const { host, port, path } = this.listenOpts;
            const isIPC = !host && !port;
            if (isIPC) {
                this._name = 'ipc';
            }
            const urlPrefix = isIPC ? new URL(`tcp://${host ?? 'localhost'}`) : `tcp://${host ?? 'localhost'}:${port ?? 3000}`;
            const baseUrl = new URL(urlPrefix, path);
            const uri = new URL(url, baseUrl);
            if (isIPC) {
                uri.protocol = 'ipc';
            }
            url = uri.toString();
        } else {
            const uri = new URL(url);
            this._name = uri.protocol.replace('://', '');
            url = uri.toString();
        }
        return url;
    }

    isAbsoluteUrl(url: string): boolean {
        return tcptl.test(url.trim())
    }

    match(protocol: string): boolean {
        return protocol === this.name;
    }
}


const tcptl = /^(tcp|ipc):\/\//i;