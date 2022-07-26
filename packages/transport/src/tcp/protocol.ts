import { IncomingPacket, Packet, Redirector, TransportStatus } from '@tsdi/core';
import { EMPTY_OBJ, Inject, Providers } from '@tsdi/ioc';
import { ListenOpts, LISTEN_OPTS } from '@tsdi/platform-server';
import { Readable, Writable } from 'stream';
import { Observable } from 'rxjs';
import { AssetRedirector } from '../client/redirector';
import { TransportProtocol } from '../protocol';
import { TcpStatus } from './status';
import { ProtocolPacket } from '../packet';

@Providers([
    { provide: TransportStatus, useClass: TcpStatus },
    { provide: Redirector, useClass: AssetRedirector }
])
export class TcpProtocol extends TransportProtocol {
    get packet(): ProtocolPacket {
        throw new Error('Method not implemented.');
    }

    private _name = 'tcp';
    constructor(@Inject(LISTEN_OPTS, {defaultValue: EMPTY_OBJ}) private listenOpts: ListenOpts, readonly status: TransportStatus, readonly redirector: Redirector) {
        super();

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

    connect(options: Record<string, any>): Promise<void> {
        throw new Error('Method not implemented.');
    }

    read(stream: Readable, encoding?: BufferEncoding | undefined): Observable<Packet<any>> {
        throw new Error('Method not implemented.');
    }

    write(stream: Writable, data: any, encoding?: BufferEncoding | undefined): Observable<Packet<any>> {
        throw new Error('Method not implemented.');
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
            const baseUrl = new URL(`${this.name}://${host}:${port ?? 3000}`, path);
            return new URL(url, baseUrl);
        }

    }

    normlizeUrl(url: string): string {
        if (!this.isAbsoluteUrl(url)) {
            const { host, port, path } = this.listenOpts;
            const urlPrefix = `${this.name}://${host ?? 'localhost'}:${port ?? 3000}`;
            const baseUrl = new URL(urlPrefix, path);
            url = new URL(url, baseUrl).toString();
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


const tcptl = /^tcp:\/\//i;
