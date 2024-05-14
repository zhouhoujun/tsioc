import { ClientTransportSession, ClientTransportSessionFactory } from '@tsdi/common/client';
import { CodingsContext, Decoder, DecodingsFactory, Encoder, EncodingsFactory, StreamAdapter, TransportOpts, ev, toBuffer } from '@tsdi/common/transport';
import { Injectable, Injector, lang } from '@tsdi/ioc';
import { Socket, RemoteInfo } from 'dgram';
import { UdpMessage } from '../consts';
import { TransportRequest } from '@tsdi/common';
import { Observable, from, fromEvent, map, takeUntil } from 'rxjs';



export class UdpClientTransportSession extends ClientTransportSession<Socket, UdpMessage> {

    constructor(
        readonly injector: Injector,
        readonly socket: Socket,
        readonly encodings: Encoder,
        readonly decodings: Decoder,
        readonly streamAdapter: StreamAdapter,
        readonly options: TransportOpts

    ) {
        super()
    }
    
    protected override initContext(ctx: CodingsContext): void {
        if(!ctx.channel) {
            const request = ctx.first<TransportRequest>();
            const url = new URL(request.url!);
            ctx.channel = url.hostname;
        }
    }

    protected override sendMessage(request: TransportRequest<any>, msg: UdpMessage): Observable<UdpMessage> {
        let writing: Promise<any>;
        if (this.streamAdapter.isReadable(msg.payload)) {
            writing = toBuffer(msg.payload, this.options.maxSize).then(data => {
                const defer = lang.defer();
                if (msg.rinfo.address) {
                    this.socket.send(data, msg.rinfo.port, msg.rinfo.address, (err) => err ? defer.reject(err) : defer.resolve())
                } else {
                    this.socket.send(data, msg.rinfo.port, (err) => err ? defer.reject(err) : defer.resolve())
                }
                return defer.promise;
            });
        } else {
            const defer = lang.defer();
            const data = msg.payload;
            if (msg.rinfo.address) {
                this.socket.send(data, msg.rinfo.port, msg.rinfo.address, (err) => err ? defer.reject(err) : defer.resolve())
            } else {
                this.socket.send(data, msg.rinfo.port, (err) => err ? defer.reject(err) : defer.resolve())
            }
            writing = defer.promise;
        }
        return from(writing).pipe(map(r => msg))
    }

    protected override handleMessage(): Observable<UdpMessage> {
        return fromEvent(this.socket, this.options.messageEvent ?? ev.MESSAGE, (payload: Buffer, rinfo: RemoteInfo) => ({ payload, rinfo, topic: this.toTopic(rinfo) }))
            .pipe(takeUntil(this.destroy$));
    }

    override async destroy(): Promise<void> {
        super.destroy();
        this.socket.close();
    }

    private toTopic(rinfo: RemoteInfo) {
        return rinfo.family == 'IPv6' ? `[${rinfo.address}]:${rinfo.port}` : `${rinfo.address}:${rinfo.port}`
    }
}


@Injectable()
export class UdpClientTransportSessionFactory implements ClientTransportSessionFactory<Socket, TransportOpts> {

    constructor() { }

    create(injector: Injector, socket: Socket, options: TransportOpts): UdpClientTransportSession {
        return new UdpClientTransportSession(injector, socket,
            injector.get(options.encodingsFactory ?? EncodingsFactory).create(injector, options),
            injector.get(options.decodingsFactory ?? DecodingsFactory).create(injector, options),
            injector.get(StreamAdapter),
            options);
    }

}