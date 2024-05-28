import { Injectable, Injector } from '@tsdi/ioc';
import { Decoder, Encoder } from '@tsdi/common/codings';
import { TransportOpts, StreamAdapter, TransportEncodingsFactory, TransportDecodingsFactory } from '@tsdi/common/transport';
import { TransportSession, TransportSessionFactory } from '../transport.session';
import { ServerOpts } from '../Server';



export class DefaultTransportSession extends TransportSession<any> {

    get options(): TransportOpts {
        return this.serverOptions.transportOpts!
    }

    constructor(
        readonly injector: Injector,
        readonly socket: any,
        readonly encodings: Encoder,
        readonly decodings: Decoder,
        readonly streamAdapter: StreamAdapter,
        readonly serverOptions: ServerOpts,

    ) {
        super()
    }

}

@Injectable()
export class DefaultTransportSessionFactory implements TransportSessionFactory<any> {

    constructor() { }

    create(injector: Injector, socket: any, options: ServerOpts): DefaultTransportSession {
        const transportOpts = options?.transportOpts ?? {};
        return new DefaultTransportSession(injector, socket,
            injector.get(transportOpts.encodingsFactory ??  TransportEncodingsFactory).create(injector, transportOpts),
            injector.get(transportOpts.decodingsFactory ??  TransportDecodingsFactory).create(injector, transportOpts),
            injector.get(StreamAdapter),
            options);
    }

}
