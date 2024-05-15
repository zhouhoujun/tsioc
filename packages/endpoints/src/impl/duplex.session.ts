import { Injectable, Injector, promisify } from '@tsdi/ioc';
import { Decoder, Encoder, DecodingsFactory, EncodingsFactory, IDuplexStream, TransportOpts, ev, isBuffer, StreamAdapter, CodingsContext } from '@tsdi/common/transport';
import { TransportSession, TransportSessionFactory } from '../transport.session';
import { Observable, from, fromEvent, map, takeUntil } from 'rxjs';
import { RequestContext } from '../RequestContext';



export class DuplexTransportSession extends TransportSession<IDuplexStream, any> {


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

    protected override sendMessage(data: RequestContext<any, any>, msg: any, context: CodingsContext): Observable<any> {
        let writing: Promise<any>;
        if (this.streamAdapter.isReadable(msg)) {
            if (this.options.parseMessage) {
                msg = this.options.parseMessage(msg, context);
            }
            if (this.options.write) {
                writing = this.streamAdapter.write(msg, this.streamAdapter.createWritable({
                    write: (chunk, encoding, callback) => {
                        this.options.write!(this.socket, chunk, encoding, callback)
                    }
                }))
            } else {
                writing = this.streamAdapter.write(msg, this.socket)
            }
        } else {
            if (this.options.parseMessage) {
                msg = this.options.parseMessage(msg, context);
            }
            if (this.options.write) {
                writing = promisify<any, Buffer, void>(this.options.write, this.options)(this.socket, msg)
            } else {
                writing = promisify<Buffer, void>(this.socket.write, this.socket)(msg)
            }
        }
        return from(writing).pipe(map(r => msg))
    }

    protected override handleMessage(context?: CodingsContext): Observable<any> {
        if (this.options.handleMessage) {
            return this.options.handleMessage(this.socket, context);
        }
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
