import { Injectable, isString } from '@tsdi/ioc';
import { HttpStatusCode, statusMessage } from '@tsdi/common';
import { Incoming, ListenOpts, mths, Packet, RedirectTransportStatus, States, TransportStrategy } from '@tsdi/core';
import { ConnectionOpts, hdr, isBuffer, PacketParser, PacketGenerator, ev, Connection } from '@tsdi/transport';
import { Buffer } from 'buffer';
import { Duplex, TransformCallback, Writable } from 'stream';
import * as tsl from 'tls';


@Injectable()
export class DelimiterTransportStrategy extends TransportStrategy implements RedirectTransportStatus {
    private _protocol = 'tcp';
    get protocol(): string {
        return this._protocol;
    }

    override isEmpty(status: number): boolean {
        return emptyStatus[status];
    }

    override isRedirect(code: number): boolean {
        return redirectStatus[code];
    }

    override isRetry(code: number): boolean {
        return retryStatus[code];
    }

    isValidCode(code: string | number): boolean {
        return !!statusMessage[code as HttpStatusCode]; 
    }
    parseCode(code?: string | number | null | undefined): string | number {
        return isString(code) ? (code ? parseInt(code) : 0) : code ?? 0;
    }
    fromCode(code: string | number): States {
        switch (code) {
            case HttpStatusCode.Ok:
                return States.Ok;

            case HttpStatusCode.NoContent:
                return States.NoContent;
            case HttpStatusCode.ResetContent:
                return States.ResetContent;
            case HttpStatusCode.NotModified:
                return States.NotModified;

            case HttpStatusCode.Found:
                return States.Found;
            case HttpStatusCode.MovedPermanently:
                return States.MovedPermanently;
            case HttpStatusCode.SeeOther:
                return States.SeeOther;
            case HttpStatusCode.UseProxy:
                return States.UseProxy;
            case HttpStatusCode.TemporaryRedirect:
                return States.TemporaryRedirect;
            case HttpStatusCode.PermanentRedirect:
                return States.PermanentRedirect;

            case HttpStatusCode.BadRequest:
                return States.BadRequest;
            case HttpStatusCode.Unauthorized:
                return States.Unauthorized;
            case HttpStatusCode.Forbidden:
                return States.Forbidden;
            case HttpStatusCode.NotFound:
                return States.NotFound;
            case HttpStatusCode.MethodNotAllowed:
                return States.MethodNotAllowed;
            case HttpStatusCode.RequestTimeout:
                return States.RequestTimeout;
            case HttpStatusCode.UnsupportedMediaType:
                return States.UnsupportedMediaType;

            case HttpStatusCode.InternalServerError:
                return States.InternalServerError;
            case HttpStatusCode.NotImplemented:
                return States.NotImplemented;
            case HttpStatusCode.BadGateway:
                return States.BadGateway;
            case HttpStatusCode.ServiceUnavailable:
                return States.ServiceUnavailable;
            case HttpStatusCode.GatewayTimeout:
                return States.GatewayTimeout;
            default:
                if (code >= 500) {
                    return States.InternalServerError;
                }
                return States.None;
        }
    }
    toCode(state: States): string | number {
        switch (state) {
            case States.Ok:
                return HttpStatusCode.Ok;

            case States.NoContent:
                return HttpStatusCode.NoContent;
            case States.ResetContent:
                return HttpStatusCode.ResetContent;
            case States.NotModified:
                return HttpStatusCode.NotModified;

            case States.Found:
                return HttpStatusCode.Found;
            case States.MovedPermanently:
                return HttpStatusCode.MovedPermanently;
            case States.SeeOther:
                return HttpStatusCode.SeeOther;
            case States.UseProxy:
                return HttpStatusCode.UseProxy;
            case States.TemporaryRedirect:
                return HttpStatusCode.TemporaryRedirect;
            case States.PermanentRedirect:
                return HttpStatusCode.PermanentRedirect;

            case States.BadRequest:
                return HttpStatusCode.BadRequest;
            case States.Unauthorized:
                return HttpStatusCode.Unauthorized;
            case States.Forbidden:
                return HttpStatusCode.Forbidden;
            case States.NotFound:
                return HttpStatusCode.NotFound;
            case States.MethodNotAllowed:
                return HttpStatusCode.MethodNotAllowed;
            case States.RequestTimeout:
                return HttpStatusCode.RequestTimeout;
            case States.UnsupportedMediaType:
                return HttpStatusCode.UnsupportedMediaType;

            case States.InternalServerError:
                return HttpStatusCode.InternalServerError;
            case States.NotImplemented:
                return HttpStatusCode.NotImplemented;
            case States.BadGateway:
                return HttpStatusCode.BadGateway;
            case States.ServiceUnavailable:
                return HttpStatusCode.ServiceUnavailable;
            case States.GatewayTimeout:
                return HttpStatusCode.GatewayTimeout;

            default:
                return HttpStatusCode.NotFound;

        }
    }
    message(code: string | number): string {
        return statusMessage[code as HttpStatusCode];
    }

    redirectBodify(status: string | number, method?: string | undefined): boolean {
        if (status === 303) return false;
        return method ? (status === 301 || status === 302) && method !== mths.POST : true;
    }

    redirectDefaultMethod(): string {
        return mths.GET;
    }

    isUpdate(req: Incoming): boolean {
        return req.method === mths.PUT;
    }

    isSecure(incoming: Incoming<Connection>): boolean {
        return incoming.connection.stream instanceof tsl.TLSSocket;
    }

    parseURL(req: Incoming, opts: ListenOpts, proxy?: boolean): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const { host, port, path } = opts;
            const isIPC = !host && !port;
            if (isIPC) {
                this._protocol = 'ipc'
            }
            const baseUrl = isIPC ? new URL(`tcp://${host ?? 'localhost'}`) : new URL(`${this.protocol}://${host}:${port ?? 3000}`, path);
            const uri = new URL(url, baseUrl);
            if (isIPC) {
                uri.protocol = 'ipc';
            }
            return uri;
        }

    }

    isAbsoluteUrl(url: string): boolean {
        return tcptl.test(url.trim())
    }

    match(protocol: string): boolean {
        return protocol === this.protocol;
    }

}



export class DelimiterParser extends PacketParser {
    private delimiter!: Buffer;

    buffers: Buffer[];
    bytes: number;
    constructor(private connection: Connection, opts: ConnectionOpts) {
        super(opts);
        this.buffers = [];
        this.bytes = 0;
        this.setOptions(opts);
    }

    override _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {

        if (!isBuffer(chunk)) {
            callback(null, chunk);
        }

        const packets: Buffer[] = [];
        let rem: Buffer | undefined;
        this.redbuff(chunk, (r, pkg) => {
            if (r) {
                rem = r;
            }
            if (pkg) {
                packets.push(pkg);
            }
        });

        if (packets.length) {
            if (this.buffers.length) {
                let first = packets.shift()!;
                this.buffers.push(first);
                this.bytes += first.length;
                first = Buffer.concat(this.buffers, this.bytes);
                this.buffers = [];
                this.bytes = 0;
                packets.unshift(first);
            }

            packets.forEach((buff, idx) => {
                const type = buff.readUInt8(0);
                const id = buff.readUInt16BE(1);

                let pkg: any;
                if (type == 1) {
                    const headers = JSON.parse(buff.slice(3).toString(encoding));
                    pkg = {
                        id,
                        headers
                    } as Packet;
                    if (headers) {
                        // this.connection.emit(ev.HEADERS, headers, id)
                        process.nextTick(() => { this.connection.emit(ev.HEADERS, headers, id) });
                    }
                    // if (idx) {
                    //     process.nextTick(() => this.write(pkg))
                    // } else {
                    callback(null, pkg);
                    // }
                } else {
                    // if (idx) {
                    //     process.nextTick(() => this.write(buff), this.write(this.delimiter));
                    // } else {
                    callback(null, buff.slice(1));
                    // }
                }
            })

        }

        if (rem) {
            this.buffers.push(rem);
            this.bytes += rem.length;
        }

    }

    redbuff(chunk: Buffer, cb: (rem: Buffer | null, packed?: Buffer) => void): void {
        const idx = chunk.indexOf(this.delimiter);
        if (idx < 0) {
            return cb(chunk);
        }
        if (idx == 0) {
            return this.redbuff(chunk.slice(this.delimiter.length), cb);
        }
        cb(null, chunk.slice(0, idx));
        const rem = (idx + this.delimiter.length) < chunk.length ? chunk.slice(idx + this.delimiter.length) : null;
        if (rem && rem.indexOf(this.delimiter) > 0) {
            this.redbuff(rem, cb)
        } else {
            cb(rem);
        }
    }

    setOptions(opts: ConnectionOpts): void {
        this.delimiter = Buffer.from(opts.delimiter!);
    }
}

const maxSize = 10 * 1024 * 1024;

const eof = Buffer.from([0]);
const headFlag = Buffer.from([1]);
const playloadFlag = Buffer.from([2]);

export class DelimiterGenerator extends PacketGenerator {
    private delimiter: Buffer;
    private maxSize: number;

    constructor(private output: Writable, private opts: ConnectionOpts) {
        super(opts);
        this.delimiter = Buffer.from(opts.delimiter!);
        this.maxSize = opts.maxSize || maxSize;
    }


    override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {

        if (isBuffer(chunk) || isString(chunk)) {
            const buff = isString(chunk) ? Buffer.from(chunk, encoding) : chunk;
            this.output.write(Buffer.concat([playloadFlag, buff, this.delimiter], playloadFlag.length + buff.length + this.delimiter.length), encoding, callback);
            return;
        }

        const list = [];
        let bytes = 0;
        const { id, headers, body } = chunk;

        if (headers) {
            list.push(headFlag);
            bytes += headFlag.length;
            if (id) {
                const idbuff = Buffer.alloc(2);
                idbuff.writeInt16BE(id)
                list.push(idbuff);
                bytes += idbuff.length;
            }
            const str = JSON.stringify(headers);
            const buffer = Buffer.from(str, encoding);
            list.push(buffer);
            bytes += Buffer.byteLength(buffer);

            list.push(this.delimiter);
            bytes += this.delimiter.length;
        }

        if (body) {
            list.push(playloadFlag);
            bytes += playloadFlag.length;
            if (id) {
                const idbuff = Buffer.alloc(2);
                idbuff.writeInt16BE(id)
                list.push(idbuff);
                bytes += idbuff.length;
            }
            if (isString(body)) {
                const buffer = Buffer.from(body, encoding);
                list.push(buffer);
                bytes += Buffer.byteLength(buffer);
            } else if (isBuffer(body)) {
                list.push(body);
                bytes += Buffer.byteLength(body);
            } else {
                const str = JSON.stringify(headers);
                const buffer = Buffer.from(str, encoding);
                list.push(buffer);
                bytes += Buffer.byteLength(buffer);

                list.push(eof);
                bytes += eof.length;
            }
        }
        if (list.length) {
            this.output.write(Buffer.concat(list, bytes), encoding, callback)
        } else {
            this.output.write(chunk, callback);
        }
    }

    setOptions(opts: ConnectionOpts): void {
        this.delimiter = Buffer.from(opts.delimiter!);
        this.maxSize = opts.maxSize || maxSize;
    }
}

const tcptl = /^(tcp|ipc):\/\//i;


// export class TcpStreamParser extends StreamParser {
//     setOptions(opts: SteamOptions): void {
//         throw new Error('Method not implemented.');
//     }

//     private id: number;
//     private streamId: Buffer;
//     private opts: SteamOptions;
//     private contentLen = 0;
//     private bytes = 0;
//     constructor(private stream: TransportStream, opts: SteamOptions) {
//         super(opts = { goawayCode: 0, ...opts, objectMode: true });
//         this.opts = opts;
//         let id = stream.id!;
//         id = this.id = opts.client ? id + 1 : id - 1;
//         this.streamId = Buffer.alloc(2);
//         this.streamId.writeInt16BE(id);
//     }

//     override _transform(chunk: string | Buffer | Packet, encoding: BufferEncoding, callback: TransformCallback): void {
//         if (isString(chunk)) {
//             const id = this.id.toString();
//             if (chunk.startsWith(id)) {
//                 callback(null, chunk.slice(id.length));
//                 if (this.contentLen) {
//                     this.bytes += chunk.length;

//                     if (this.bytes >= this.contentLen) {
//                         process.nextTick(() => this.emit('end'));
//                     }
//                 }
//             }
//         } else if (isBuffer(chunk)) {
//             if (chunk.indexOf(this.streamId) === 0) {
//                 const buff = chunk.slice(this.streamId.length);
//                 callback(null, buff);
//                 if (this.contentLen) {
//                     this.bytes += buff.length;

//                     if (this.bytes >= this.contentLen) {
//                         process.nextTick(() => this.emit('end'));
//                     }
//                 }
//             }
//         } else if (chunk) {
//             if (chunk.id === this.id) {
//                 if (chunk.headers) {
//                     this.stream.emit(this.opts.client ? ev.RESPONSE : ev.HEADERS, chunk.headers, chunk.id);
//                     this.contentLen = ~~(chunk.headers[hdr.CONTENT_LENGTH] ?? '0');
//                     this.bytes = 0;
//                     // if (this.opts.client && this.contentLen <= 0) {
//                     //     this.emit('end');
//                     // }
//                 }
//             }
//         }
//     }

// }

// export class TcptreamGenerator extends StreamGenerator {
//     setOptions(opts: SteamOptions): void {
//         throw new Error('Method not implemented.');
//     }
//     private streamId: Buffer;
//     constructor(private output: Writable, private id: number, opts?: SteamOptions) {
//         super({ ...opts, objectMode: true });
//         this.streamId = Buffer.alloc(2);
//         this.streamId.writeInt16BE(id);
//     }

//     override _write(chunk: string | Buffer | Packet, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
//         if (isString(chunk)) {
//             const buffer = Buffer.from(chunk, encoding);
//             chunk = Buffer.concat([this.streamId, buffer], this.streamId.length + buffer.length);
//         } else if (isBuffer(chunk)) {
//             chunk = Buffer.concat([this.streamId, chunk], this.streamId.length + chunk.length);
//         } else if (chunk) {
//             chunk.id = this.id;
//         }

//         this.output.write(chunk, encoding, callback);
//     }
// }


/**
 * status codes for redirects
 */
const redirectStatus: Record<number, boolean> = {
    300: true,
    301: true,
    302: true,
    303: true,
    305: true,
    307: true,
    308: true
}

/**
 * status codes for empty bodies
 */
const emptyStatus: Record<number, boolean> = {
    204: true,
    205: true,
    304: true
}

/**
 * status codes for when you should retry the request
 */
const retryStatus: Record<number, boolean> = {
    502: true,
    503: true,
    504: true
}

