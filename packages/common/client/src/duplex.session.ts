import { Injectable, Injector, promisify } from '@tsdi/ioc';
import { Decoder, Encoder, TransportRequest } from '@tsdi/common';
import { DecodingsFactory, EncodingsFactory, IDuplexStream, TransportOpts, ev, isBuffer } from '@tsdi/common/transport';
import { Observable, from, fromEvent, map, takeUntil } from 'rxjs';
import { ClientTransportSession, ClientTransportSessionFactory } from './session';


export class ClientDuplexTransportSession extends ClientTransportSession<IDuplexStream, Buffer> {

    protected msgEvent = ev.DATA;
    constructor(
        readonly socket: IDuplexStream,
        readonly encodings: Encoder,
        readonly decodings: Decoder,
        readonly options: TransportOpts,

    ) {
        super()
    }

    sendMessage(data: TransportRequest<any>, msg: Buffer): Observable<Buffer> {
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
export class ClientDuplexTransportSessionFactory implements ClientTransportSessionFactory<IDuplexStream> {

    constructor() { }

    create(injector: Injector, socket: IDuplexStream, options: TransportOpts): ClientDuplexTransportSession {
        return new ClientDuplexTransportSession(socket,
            injector.get(options.encodingsFactory ?? EncodingsFactory).create(injector, options),
            injector.get(options.decodingsFactory ?? DecodingsFactory).create(injector, options),
            options);
    }

}