import { Injectable, Injector } from '@tsdi/ioc';
import { MessageFactory } from '@tsdi/common';
import {
    TransportOpts, StreamAdapter, TransportEncodingsFactory, TransportDecodingsFactory,
    StatusAdapter, IncomingFactory, TransportEncodings, TransportDecodings
} from '@tsdi/common/transport';
import { TransportSession, TransportSessionFactory } from '../transport.session';
import { ServerOpts } from '../Server';


export class DefaultTransportSession extends TransportSession<any> {

    get options(): TransportOpts {
        return this.serverOptions.transportOpts!
    }

    constructor(
        readonly injector: Injector,
        readonly socket: any,
        readonly encodings: TransportEncodings,
        readonly decodings: TransportDecodings,
        readonly streamAdapter: StreamAdapter,
        readonly statusAdapter: StatusAdapter | null,
        readonly messageFactory: MessageFactory,
        readonly incomingFactory: IncomingFactory,
        readonly serverOptions: ServerOpts,
    ) {
        super()
        this.encodings.session = this.decodings.session = this;
    }

}

@Injectable()
export class DefaultTransportSessionFactory implements TransportSessionFactory<any> {

    constructor() { }

    create(injector: Injector, socket: any, options: ServerOpts): DefaultTransportSession {
        const transportOpts = options?.transportOpts ?? {};
        return new DefaultTransportSession(injector, socket,
            injector.get(transportOpts.encodingsFactory ?? TransportEncodingsFactory).create(injector, transportOpts),
            injector.get(transportOpts.decodingsFactory ?? TransportDecodingsFactory).create(injector, transportOpts),
            injector.get(StreamAdapter),
            injector.get(StatusAdapter, null),
            injector.get(MessageFactory),
            injector.get(IncomingFactory),
            options);
    }

}
