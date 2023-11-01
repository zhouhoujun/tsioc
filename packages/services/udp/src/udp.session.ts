import { ArgumentExecption, Injectable, Injector, lang } from '@tsdi/ioc';
import { Context, Decoder, Encoder, Packet, RequestPacket, StreamAdapter, TransportOpts, TransportSessionFactory, ev } from '@tsdi/common';
import { EventTransportSession } from '@tsdi/endpoints';
import { Socket, RemoteInfo } from 'dgram';
import { Observable, first, fromEvent, map, merge } from 'rxjs';
import { UdpClientTransportOpts } from './client/options';



export interface UdpMessage {
    msg: Buffer;
    topic: string;
    rinfo: RemoteInfo;
}

export interface UdpPacket<T = any> extends Packet<T> {
    rinfo: RemoteInfo;
}

export class UdpTransportSession extends EventTransportSession<Socket, UdpMessage> {

    protected message(): Observable<UdpMessage> {
        return fromEvent(this.socket, ev.MESSAGE, (msg: Buffer, rinfo: RemoteInfo) => ({ msg, rinfo, topic: this.toTopic(rinfo) }))
    }

    toTopic(rinfo: RemoteInfo) {
        return rinfo.family == 'IPv6' ? `[${rinfo.address}]:${rinfo.port}` : `${rinfo.address}:${rinfo.port}`
    }

    protected mergeClose(source: Observable<any>): Observable<any> {
        const close$ = fromEvent(this.socket, ev.CLOSE).pipe(
            map(err => {
                throw err
            }));

        const error$ = fromEvent(this.socket, ev.ERROR);
        return merge(source, error$, close$).pipe(first());
    }


    protected override getTopic(msg: UdpMessage): string {
        return msg.topic
    }
    protected override getPayload(msg: UdpMessage): string | Buffer | Uint8Array {
        return msg.msg;
    }

    protected override afterDecode(ctx: Context, pkg: Packet<any>, msg: UdpMessage): Packet<any> {
        pkg.topic = msg.topic;
        return pkg;
    }

    protected async write(data: Buffer, packet: Packet<any>): Promise<void> {
        if (!packet.topic) throw new ArgumentExecption('topic can not be empty.')
        const idx = packet.topic.lastIndexOf(':');
        const port = parseInt(packet.topic.substring(idx + 1));
        const addr = packet.topic.substring(0, idx);
        const defer = lang.defer();
        if (!addr) {
            this.socket.send(data, port, (err) => err ? defer.reject(err) : defer.resolve())
        } else {
            this.socket.send(data, port, addr, (err) => err ? defer.reject(err) : defer.resolve())
        }
        await defer.promise;
    }

    protected async beforeRequest(packet: RequestPacket<any>): Promise<void> {
        if (!packet.topic) {
            packet.topic = packet.url && udptl.test(packet.url) ? new URL(packet.url).host : (this.options as UdpClientTransportOpts).host;
        }
    }

    async destroy(): Promise<void> {
    }
}

const udptl = /^udp(s)?:\/\//i;


@Injectable()
export class UdpTransportSessionFactory implements TransportSessionFactory<Socket> {

    constructor(
        readonly injector: Injector,
        private streamAdapter: StreamAdapter,
        private encoder: Encoder,
        private decoder: Decoder) {

    }

    create(socket: Socket, options: TransportOpts): UdpTransportSession {
        return new UdpTransportSession(this.injector, socket, this.streamAdapter, this.encoder, this.decoder, options);
    }

}
