import { ListenOpts, mths, TransportProtocol } from '@tsdi/core';
import { Injectable, isNumber, isString } from '@tsdi/ioc';
import { hdr } from '@tsdi/transport';
import * as http from 'http';
import * as http2 from 'http2';
import { TLSSocket } from 'tls';
import { HttpStatus } from './status';

@Injectable()
export class HttpProtocol extends TransportProtocol {

    private _protocol = 'http';
    constructor(readonly status: HttpStatus) {
        super();
    }

    isUpdate(req: http.IncomingMessage | http2.Http2ServerRequest): boolean {
        return req.method === mths.PUT
    }

    isSecure(req: http.IncomingMessage | http2.Http2ServerRequest): boolean {
        return this.protocol === 'https' || (req?.socket as TLSSocket)?.encrypted === true
    }

    get protocol(): string {
        return this._protocol;
    }

    parse(req: http.IncomingMessage | http2.Http2ServerRequest, opts: ListenOpts, proxy?: boolean): URL {
        const url = req.url?.trim() ?? '';
        if (httptl.test(url)) {
            return new URL(url);
        } else {
            if ((req.socket as TLSSocket).encrypted) {
                this._protocol = 'https';
            } else if (!proxy) {
                this._protocol = 'http';
            } else {
                const proto = req.headers[hdr.X_FORWARDED_PROTO] as string;
                this._protocol = (proto ? proto.split(urlsplit, 1)[0] : 'http');
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
            return new URL(`${this.protocol}://${host}${url}`);
        }

    }

    // normlizeUrl(url: string, opts: ListenOpts): string {
    //     if (!this.isAbsoluteUrl(url)) {
    //         const { host, port, path, withCredentials } = opts;
    //         if (withCredentials) {
    //             this._protocol = 'https';
    //         }
    //         const urlPrefix = `${this.protocol}://${host ?? 'localhost'}:${port ?? 3000}`;
    //         const baseUrl = new URL(urlPrefix, path);
    //         url = new URL(url, baseUrl).toString();
    //     } else {
    //         const uri = new URL(url);
    //         this._protocol = uri.protocol.replace('://', '');
    //         url = uri.toString();
    //     }
    //     return url;
    // }

    isAbsoluteUrl(url: string): boolean {
        return httptl.test(url.trim())
    }

    match(protocol: string): boolean {
        return protocol === this.protocol;
    }
}

const AUTHORITY = http2.constants?.HTTP2_HEADER_AUTHORITY ?? ':authority';

const httptl = /^https?:\/\//i;
const urlsplit = /\s*,\s*/;
