import { MessageFactory } from '@tsdi/common';
import {
    FileAdapter,
    IncomingFactory,
    MessageReader,
    MessageWriter,
    MimeAdapter,
    OutgoingFactory,
    StatusAdapter,
    StreamAdapter,
    TransportDecodings,
    TransportDecodingsFactory,
    TransportEncodings,
    TransportEncodingsFactory,
    TransportOpts
} from '@tsdi/common/transport';
import { Injectable, Injector } from '@tsdi/ioc';
import { ServerOpts } from '../Server';
import { TransportSession, TransportSessionFactory } from '../transport.session';
import { RequestContextFactory } from '../RequestContext';
import { AcceptsPriority } from '../accepts';


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
        readonly fileAdapter: FileAdapter,
        readonly mimeAdapter: MimeAdapter | null,
        readonly acceptsPriority: AcceptsPriority | null,
        readonly statusAdapter: StatusAdapter | null,
        readonly messageReader: MessageReader,
        readonly messageWriter: MessageWriter,
        readonly messageFactory: MessageFactory,
        readonly incomingFactory: IncomingFactory,
        readonly outgoingFactory: OutgoingFactory,
        readonly requestContextFactory: RequestContextFactory,
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
            injector.get(FileAdapter),
            injector.get(MimeAdapter, null),
            injector.get(AcceptsPriority, null),
            injector.get(StatusAdapter, null),
            injector.get(MessageReader),
            injector.get(MessageWriter),
            injector.get(MessageFactory),
            injector.get(IncomingFactory),
            injector.get(OutgoingFactory),
            injector.get(RequestContextFactory),
            options);
    }

}
