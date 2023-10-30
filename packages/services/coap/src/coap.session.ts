import { ArgumentExecption, Injectable, Injector, lang, promisify } from '@tsdi/ioc';
import { Packet, RequestPacket, TransportFactory, TransportOpts, TransportSessionFactory, ev } from '@tsdi/common';
import { AbstractTransportSession } from '@tsdi/endpoints';
import { Socket, RemoteInfo } from 'dgram';
import { parse, generate } from 'coap-packet';
import { Observable, first, fromEvent, map, merge } from 'rxjs';
import { CoapTransportOpts } from './client/options';
import { coapurl$ } from './trans';


export interface UdpMessage {
    msg: Buffer;
    rinfo: RemoteInfo
}

export interface UdpPacket<T = any> extends Packet<T> {
    rinfo: RemoteInfo;
}



@Injectable()
export class CoapTransportSessionFactory implements TransportSessionFactory<Socket> {

    constructor(readonly injector: Injector, private factory: TransportFactory) { }

    create(socket: Socket, options: TransportOpts): CoapTransportSession {
        return new CoapTransportSession(this.injector, socket, this.factory.createSender(options), this.factory.createReceiver(options), options);
    }

}

export class CoapTransportSession extends AbstractTransportSession<Socket, UdpMessage> {

    protected message(): Observable<UdpMessage> {
        return fromEvent(this.socket, ev.MESSAGE, (msg: Buffer, rinfo: RemoteInfo) => ({ msg, rinfo }))
    }

    protected mergeClose(source: Observable<any>): Observable<any> {
        const close$ = fromEvent(this.socket, ev.CLOSE).pipe(
            map(err => {
                throw err
            }));
        const error$ = fromEvent(this.socket, ev.ERROR);
        return merge(source, close$, error$).pipe(first());
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

    override serialize(packet: UdpPacket, withPayload?: boolean): Buffer {
        let pkg: Packet;
        if (withPayload) {
            const { rinfo, length, ...data } = packet;
            pkg = data;
        } else {
            const { payload, rinfo, ...headers } = packet;
            pkg = headers;
        }
        return generate(packet, this.options.maxSize);
    }

    deserialize(raw: Buffer): Packet<any> {
        return parse(raw);
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
            packet.topic = packet.url && coapurl$.test(packet.url) ? new URL(packet.url).host : this.defaultHost()
        }
    }

    protected defaultHost() {
        const opts = this.options as CoapTransportOpts;
        return opts.host || (opts.hostname && ipv6Exp.test(opts.hostname)? `[${opts.hostname}]:${opts.port}` : `${opts.hostname}:${opts.port}`)
    }

    async destroy(): Promise<void> {
        await promisify(this.socket.close, this.socket)();
    }
}

const ipv6Exp = /:/;

