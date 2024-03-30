import { EMPTY, Injectable, Injector, promisify } from '@tsdi/ioc';
import { Decoder, Encoder } from '@tsdi/common';
import { IDuplexStream, TransportOpts, ev, isBuffer } from '@tsdi/common/transport';
import { TransportSession, TransportSessionFactory } from '../transport.session';
import { Observable, from, fromEvent, map, takeUntil } from 'rxjs';
import { RequestContext } from '../RequestContext';



export class DuplexTransportSession extends TransportSession<IDuplexStream, Buffer> {

    protected msgEvent = ev.DATA;
    constructor(
        readonly socket: IDuplexStream,
        readonly encodings: Encoder[],
        readonly decodings: Decoder[],
        readonly options: TransportOpts,

    ) {
        super()
    }

    sendMessage(data: RequestContext<any, any>, msg: Buffer): Observable<Buffer> {
        return from(promisify<Buffer, void>(this.socket.write, this.socket)(msg)).pipe(map(r => msg))
    }

    handleMessage(): Observable<Buffer> {
        return fromEvent(this.socket, this.msgEvent, (chunk) => isBuffer(chunk) ? chunk : Buffer.from(chunk)).pipe(takeUntil(this.destroy$));
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
        return new DuplexTransportSession(socket, injector.get(options.encodings!, EMPTY), injector.get(options.decodings!, EMPTY), options);
    }

}
