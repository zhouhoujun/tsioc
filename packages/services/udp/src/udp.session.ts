import { ArgumentExecption, Injectable, Injector, lang } from '@tsdi/ioc';
import { Packet, RequestPacket, TransportFactory, TransportOpts, TransportSessionFactory, ev } from '@tsdi/common';
import { AbstractTransportSession } from '@tsdi/endpoints';
import { Socket, RemoteInfo } from 'dgram';
import { Observable, first, fromEvent, map, merge } from 'rxjs';
import { UdpClientTransportOpts } from './client/options';



export interface UdpMessage {
    msg: Buffer;
    rinfo: RemoteInfo;
}

export interface UdpPacket<T = any> extends Packet<T> {
    rinfo: RemoteInfo;
}

export class UdpTransportSession extends AbstractTransportSession<Socket, UdpMessage> {
    protected message(): Observable<UdpMessage> {
        return fromEvent(this.socket, ev.MESSAGE, (msg: Buffer, rinfo: RemoteInfo) => ({ msg, rinfo }))
    }
    protected mergeClose(source: Observable<any>): Observable<any> {
        const close$ = fromEvent(this.socket, ev.CLOSE).pipe(
            map(err => {
                throw err
            }));

        const error$ = fromEvent(this.socket, ev.ERROR);
        return merge(source, error$, close$).pipe(first());
    }

    protected override unpack(msg: UdpMessage): Observable<Packet> {
        const topic = msg.rinfo.family == 'IPv6' ? `[${msg.rinfo.address}]:${msg.rinfo.port}` : `${msg.rinfo.address}:${msg.rinfo.port}`;
        return this.receiver.receive(this.contextFactory, msg.msg, topic)
            .pipe(
                map(pkg => {
                    pkg.topic = topic;
                    return pkg;
                })
            );
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

    constructor(readonly injector: Injector, private factory: TransportFactory) { }

    create(socket: Socket, options: TransportOpts): UdpTransportSession {
        return new UdpTransportSession(this.injector, socket, this.factory.createSender(options), this.factory.createReceiver(options), options);
    }

}
