import { Injectable, Injector } from '@tsdi/ioc';
import { Decoder, Encoder, DecodingsFactory, EncodingsFactory, TransportOpts, StreamAdapter } from '@tsdi/common/transport';
import { TransportSession, TransportSessionFactory } from '../transport.session';



export class DefaultTransportSession extends TransportSession<any> {

    constructor(
        readonly injector: Injector,
        readonly socket: any,
        readonly encodings: Encoder,
        readonly decodings: Decoder,
        readonly streamAdapter: StreamAdapter,
        readonly options: TransportOpts,

    ) {
        super()
    }

}

@Injectable()
export class DefaultTransportSessionFactory implements TransportSessionFactory<any> {

    constructor() { }

    create(injector: Injector, socket: any, options: TransportOpts): DefaultTransportSession {
        return new DefaultTransportSession(injector, socket,
            injector.get(options.encodingsFactory ?? EncodingsFactory).create(injector, options),
            injector.get(options.decodingsFactory ?? DecodingsFactory).create(injector, options),
            injector.get(StreamAdapter),
            options);
    }

}
