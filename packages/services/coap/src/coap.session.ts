import { Injectable, Optional, promisify } from '@tsdi/ioc';
import { Decoder, Encoder, Packet, RequestPacket, Transport, TransportFactory, TransportOpts, TransportSessionFactory, ev } from '@tsdi/common';
import { AbstractTransportSession } from '@tsdi/endpoints';
import { Socket, RemoteInfo } from 'dgram';
import { parse, generate } from 'coap-packet';
import { Observable, first, fromEvent, map, merge } from 'rxjs';


export interface UdpMsg {
    msg: Buffer;
    rsinfo: RemoteInfo
}




@Injectable()
export class CoapTransportSessionFactoryImpl implements TransportSessionFactory<Socket> {

    constructor(
        private factory: TransportFactory,
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: Socket, transport: Transport, options: TransportOpts): CoapTransportSession {
        return new CoapTransportSession(socket, this.factory.createSender(transport, options), this.factory.createReceiver(transport, options), options);
    }

}

export class CoapTransportSession extends AbstractTransportSession<Socket, UdpMsg> {

    protected message(): Observable<UdpMsg> {
        return fromEvent(this.socket, ev.MESSAGE, (msg: Buffer, rsinfo: RemoteInfo) => ({ msg, rsinfo }))
    }

    protected mergeClose(source: Observable<any>): Observable<any> {
        const close$ = fromEvent(this.socket, ev.CLOSE).pipe(
            map(err => {
                throw err
            }));
        const error$ = fromEvent(this.socket, ev.ERROR).pipe(
            map(err => {
                throw err
            }));
        return merge(source, close$, error$).pipe(first());
    }

    protected async beforeRequest(packet: RequestPacket<any>): Promise<void> {

    }

    protected override pack(packet: Packet<any>): Observable<Buffer> {
        generate(packet);
        return this.sender.send(packet);
    }

    protected override unpack(msg: UdpMsg): Observable<Packet<any>> {
        const channel = `${msg.rsinfo.address}:${msg.rsinfo.port}`;
        return this.receiver.receive(msg.msg, channel)
            .pipe(
                map(pkg => {
                    return {
                        ...pkg,
                        replyTo: channel
                    }
                })
            );

    }

    protected write(data: Buffer, packet: Packet<any>): Promise<void> {
        throw new Error('Method not implemented.');
    }

    async destroy(): Promise<void> {
        await promisify(this.socket.close, this.socket)();
    }

    // maxSize = 1024 - 6;
    // write(subpkg: Subpackage, chunk: Buffer, callback?: ((err?: any) => void) | undefined): void {
    //     if (!subpkg.headerSent) {
    //         const buff = this.generateHeader(subpkg)

    //         if (this.hasPayloadLength(subpkg.packet)) {
    //             subpkg.residueSize = subpkg.payloadSize ?? 0;
    //             subpkg.caches = [buff];
    //             subpkg.cacheSize = Buffer.byteLength(buff);
    //             subpkg.headerSent = true;
    //             subpkg.headCached = true;
    //             if (chunk) {
    //                 this.write(subpkg, chunk, callback)
    //             } else {
    //                 callback?.();
    //             }
    //         } else {
    //             this.socket.send(buff, (err) => {
    //                 if (err) {
    //                     this.handleFailed(err);
    //                 }
    //                 callback?.(err);
    //             });
    //         }

    //         return;
    //     }

    //     if (!chunk) throw new ArgumentExecption('chunk can not be null!');


    //     const bufSize = Buffer.byteLength(chunk);
    //     const maxSize = (this.options.maxSize || this.maxSize) - (subpkg.headCached ? 6 : 3);

    //     const tol = subpkg.cacheSize + bufSize;
    //     if (tol == maxSize) {
    //         subpkg.caches.push(chunk);
    //         const data = this.getSendBuffer(subpkg, maxSize);
    //         subpkg.residueSize -= bufSize;
    //         this.socket.send(data, (err) => {
    //             if (err) {
    //                 this.handleFailed(err);
    //             }
    //             callback?.(err)
    //         });
    //     } else if (tol > maxSize) {
    //         const idx = bufSize - (tol - maxSize);
    //         const message = chunk.subarray(0, idx);
    //         const rest = chunk.subarray(idx);
    //         subpkg.caches.push(message);
    //         const data = this.getSendBuffer(subpkg, maxSize);
    //         subpkg.residueSize -= (bufSize - Buffer.byteLength(rest));
    //         this.socket.send(data, (err) => {
    //             if (err) {
    //                 this.handleFailed(err);
    //                 return callback?.(err);
    //             }
    //             if (rest.length) {
    //                 this.write(subpkg, rest, callback)
    //             }
    //         })
    //     } else {
    //         subpkg.caches.push(chunk);
    //         subpkg.cacheSize += bufSize;
    //         subpkg.residueSize -= bufSize;
    //         if (subpkg.residueSize <= 0) {
    //             const data = this.getSendBuffer(subpkg, subpkg.cacheSize);
    //             this.socket.send(data, (err) => {
    //                 if (err) {
    //                     this.handleFailed(err);
    //                 }
    //                 callback?.(err);
    //             });
    //         } else if (callback) {
    //             callback()
    //         }
    //     }
    // }

}



