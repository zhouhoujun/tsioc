import { Injectable, Injector, promisify } from '@tsdi/ioc';
import { Decoder, Encoder, DecodingsFactory, EncodingsFactory, IDuplexStream, TransportOpts, ev, isBuffer, StreamAdapter, IReadableStream } from '@tsdi/common/transport';
import { TransportSession, TransportSessionFactory } from '../transport.session';
import { Observable, from, fromEvent, map, takeUntil } from 'rxjs';
import { RequestContext } from '../RequestContext';



export class DuplexTransportSession extends TransportSession<IDuplexStream, Buffer | IReadableStream> {


    constructor(
        readonly injector: Injector,
        readonly socket: IDuplexStream,
        readonly encodings: Encoder,
        readonly decodings: Decoder,
        readonly streamAdapter: StreamAdapter,
        readonly options: TransportOpts,

    ) {
        super()
    }

    sendMessage(data: RequestContext<any, any>, msg: Buffer | IReadableStream): Observable<Buffer | IReadableStream> {
        let writing: Promise<any>;
        if (this.streamAdapter.isReadable(msg)) {
            writing = this.streamAdapter.write(msg, this.socket)
        } else {
            writing = promisify<Buffer, void>(this.socket.write, this.socket)(msg)
        }
        return from(writing).pipe(map(r => msg))
    }

    handleMessage(): Observable<Buffer | IReadableStream> {
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
export class DuplexTransportSessionFactory implements TransportSessionFactory<IDuplexStream> {

    constructor() { }

    create(injector: Injector, socket: IDuplexStream, options: TransportOpts): DuplexTransportSession {
        return new DuplexTransportSession(injector, socket,
            injector.get(options.encodingsFactory ?? EncodingsFactory).create(injector, options),
            injector.get(options.decodingsFactory ?? DecodingsFactory).create(injector, options),
            injector.get(StreamAdapter),
            options);
    }

}
