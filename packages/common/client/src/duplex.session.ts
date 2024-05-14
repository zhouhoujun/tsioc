import { Injectable, Injector, promisify } from '@tsdi/ioc';
import { TransportRequest } from '@tsdi/common';
import { Decoder, Encoder, DecodingsFactory, EncodingsFactory, IDuplexStream, TransportOpts, ev, isBuffer, IReadableStream, StreamAdapter } from '@tsdi/common/transport';
import { Observable, from, fromEvent, map, takeUntil } from 'rxjs';
import { ClientTransportSession, ClientTransportSessionFactory } from './session';


export class DuplexClientTransportSession extends ClientTransportSession<IDuplexStream, Buffer | IReadableStream> {

    constructor(
        readonly injector: Injector,
        readonly socket: IDuplexStream,
        readonly encodings: Encoder,
        readonly decodings: Decoder,
        readonly streamAdapter: StreamAdapter,
        readonly options: TransportOpts

    ) {
        super()
    }

    protected override sendMessage(data: TransportRequest<any>, msg: Buffer | IReadableStream): Observable<Buffer | IReadableStream> {
        let writing: Promise<any>;
        if (this.streamAdapter.isReadable(msg)) {
            writing = this.streamAdapter.write(msg, this.socket)
        } else {
            writing = promisify<Buffer, void>(this.socket.write, this.socket)(msg)
        }
        return from(writing).pipe(map(r => msg))
    }

    protected override handleMessage(): Observable<Buffer | IReadableStream> {
        return fromEvent(this.socket, this.options.messageEvent ?? ev.DATA, (chunk) => {
            if (isBuffer(chunk) || this.streamAdapter.isReadable(chunk)) return chunk;
            return Buffer.from(chunk)
        }).pipe(takeUntil(this.destroy$));
    }

    override async destroy(): Promise<void> {
        super.destroy();
        this.socket.destroy?.();
    }

}


@Injectable()
export class DuplexClientTransportSessionFactory implements ClientTransportSessionFactory<IDuplexStream, TransportOpts> {

    constructor() { }

    create(injector: Injector, socket: IDuplexStream, options: TransportOpts): DuplexClientTransportSession {
        return new DuplexClientTransportSession(injector, socket,
            injector.get(options.encodingsFactory ?? EncodingsFactory).create(injector, options),
            injector.get(options.decodingsFactory ?? DecodingsFactory).create(injector, options),
            injector.get(StreamAdapter),
            options);
    }

}