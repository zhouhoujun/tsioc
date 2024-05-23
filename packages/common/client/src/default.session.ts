import { Injectable, Injector } from '@tsdi/ioc';
import { Decoder, Encoder, DecodingsFactory, EncodingsFactory } from '@tsdi/common/codings';
import { IDuplexStream, TransportOpts, StreamAdapter } from '@tsdi/common/transport';
import { ClientTransportSession, ClientTransportSessionFactory } from './session';



export class DefaultClientTransportSession extends ClientTransportSession<any> {

    constructor(
        readonly injector: Injector,
        readonly socket: any,
        readonly encodings: Encoder,
        readonly decodings: Decoder,
        readonly streamAdapter: StreamAdapter,
        readonly options: TransportOpts

    ) {
        super()
    }

}


@Injectable()
export class DefaultClientTransportSessionFactory implements ClientTransportSessionFactory<any> {

    constructor() { }

    create(injector: Injector, socket: IDuplexStream, options: TransportOpts): DefaultClientTransportSession {
        return new DefaultClientTransportSession(injector, socket,
            injector.get(options.encodingsFactory ?? EncodingsFactory).create(injector, options.encodings!),
            injector.get(options.decodingsFactory ?? DecodingsFactory).create(injector, options.decodings!),
            injector.get(StreamAdapter),
            options);
    }

}