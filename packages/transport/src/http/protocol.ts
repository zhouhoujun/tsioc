import { Packet, Redirector, TransportStatus } from '@tsdi/core';
import { EMPTY_OBJ, Inject, isNumber, isString, Providers } from '@tsdi/ioc';
import { ListenOpts, LISTEN_OPTS } from '@tsdi/platform-server';
import { Readable, Writable } from 'stream';
import * as http from 'http';
import * as http2 from 'http2';
import { TLSSocket } from 'tls';
import { Observable } from 'rxjs';
import { AssetRedirector } from '../client/redirector';
import { TransportProtocol } from '../protocol';
import { HttpStatus } from './status';
import { hdr } from '../consts';
import { ProtocolPacket } from '../packet';

@Providers([
    { provide: TransportStatus, useClass: HttpStatus },
    { provide: Redirector, useClass: AssetRedirector }
])
export class HttpProtocol extends TransportProtocol {

    private _name = 'http';
    constructor(@Inject(LISTEN_OPTS, { defaultValue: EMPTY_OBJ }) private listenOpts: ListenOpts, readonly status: TransportStatus, readonly redirector: Redirector) {
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
        return this.name === 'https'
    }

    get packet(): ProtocolPacket {
        throw new Error('Method not implemented.');
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

    parse(req: http.IncomingMessage | http2.Http2ServerRequest, proxy?: boolean | undefined): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            if ((req.socket as TLSSocket).encrypted) {
                this._name = 'https';
            } else if (!proxy) {
                this._name = 'http';
            } else {
                const proto = req.headers[hdr.X_FORWARDED_PROTO] as string;
                this._name = (proto ? proto.split(urlsplit, 1)[0] : 'http');
            }

            let host = proxy && req.headers[hdr.X_FORWARDED_HOST];
            if (!host) {
                if (req.httpVersionMajor >= 2) host = req.headers[AUTHORITY];
                if (!host) host = req.headers[hdr.HOST];
            }
            if (!host || isNumber(host)) {
                host = '';
            } else {
                host = isString(host) ? host.split(urlsplit, 1)[0] : host[0]
            }
            return new URL(`${this.name}://${host}${url}`);
        }

    }

    normlizeUrl(url: string): string {
        if (!this.isAbsoluteUrl(url)) {
            const { host, port, path, withCredentials } = this.listenOpts;
            if (withCredentials) {
                this._name = 'https';
            }
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
        return httptl.test(url.trim())
    }

    match(protocol: string): boolean {
        return protocol === this.name;
    }
}

const AUTHORITY = http2.constants?.HTTP2_HEADER_AUTHORITY ?? ':authority';

const httptl = /^https?:\/\//i;
const urlsplit = /\s*,\s*/;
