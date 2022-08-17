import { IncomingPacket, Packet, RequestPacket } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { ListenOpts } from '@tsdi/platform-server';
import { ConnectionOpts, PacketProtocol, ServerStream } from '@tsdi/transport';
import { Duplex, Transform, Writable } from 'stream';
import { TcpStatus } from './status';

@Injectable()
export class TcpProtocol extends PacketProtocol {

    private _protocol = 'tcp';
    constructor(readonly status: TcpStatus) {
        super();
    }

    isEvent(req: RequestPacket<any>): boolean {
        return req.method === 'events';
    }

    isUpdate(req: IncomingPacket): boolean {
        return req.method === 'PUT';
    }

    isSecure(incoming: IncomingPacket<ServerStream>): boolean {
        return incoming.stream
    }

    get protocol(): string {
        return this._protocol;
    }

    parse(req: IncomingPacket, opts: ListenOpts, proxy?: boolean): URL {
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

    normlizeUrl(url: string, opts: ListenOpts): string {
        if (!this.isAbsoluteUrl(url)) {
            const { host, port, path } = opts;
            const isIPC = !host && !port;
            if (isIPC) {
                this._protocol = 'ipc';
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
            this._protocol = uri.protocol.replace('://', '');
            url = uri.toString();
        }
        return url;
    }

    isAbsoluteUrl(url: string): boolean {
        return tcptl.test(url.trim())
    }

    match(protocol: string): boolean {
        return protocol === this.protocol;
    }

    generateId(): string {
        return Math.max(1, Math.floor(Math.random() * 65535)).toString()
    }
    
    valid(header: string): boolean {
        return true;
    }
    transform(opts?: ConnectionOpts | undefined): Transform {
        throw new Error('Method not implemented.');
    }
    generate(stream: Duplex, opts?: ConnectionOpts | undefined): Writable {
        throw new Error('Method not implemented.');
    }
    isHeader(chunk: any): boolean {
        throw new Error('Method not implemented.');
    }
    parseHeader(chunk: any): Packet<any> {
        throw new Error('Method not implemented.');
    }
    isBody(chunk: any, streamId: string): boolean {
        throw new Error('Method not implemented.');
    }
    parseBody(chunk: any, streamId: string) {
        throw new Error('Method not implemented.');
    }
    attachStreamId(chunk: any, streamId: string) {
        throw new Error('Method not implemented.');
    }

}


const tcptl = /^(tcp|ipc):\/\//i;
