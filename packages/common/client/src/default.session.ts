import { MessageFactory, ResponseFactory } from '@tsdi/common';
import { ClientIncomingFactory, IDuplexStream, MessageReader, MessageWriter, Redirector, StatusAdapter, StreamAdapter, TransportDecodings, TransportDecodingsFactory, TransportEncodings, TransportEncodingsFactory, TransportOpts } from '@tsdi/common/transport';
import { Injectable, Injector } from '@tsdi/ioc';
import { ClientTransportSession, ClientTransportSessionFactory } from './session';



export class DefaultClientTransportSession extends ClientTransportSession<any> {

    constructor(
        readonly injector: Injector,
        readonly socket: any,
        readonly encodings: TransportEncodings,
        readonly decodings: TransportDecodings,
        readonly streamAdapter: StreamAdapter,
        readonly statusAdapter: StatusAdapter | null,
        readonly redirector: Redirector | null,
        readonly messageReader: MessageReader,
        readonly messageWriter: MessageWriter,
        readonly messageFactory: MessageFactory,
        readonly incomingFactory: ClientIncomingFactory,
        readonly responseFactory: ResponseFactory,
        readonly options: TransportOpts

    ) {
        super()
        this.encodings.session = this.decodings.session = this;
    }

}


@Injectable()
export class DefaultClientTransportSessionFactory implements ClientTransportSessionFactory<any> {

    constructor() { }

    create(injector: Injector, socket: IDuplexStream, options: TransportOpts): DefaultClientTransportSession {
        return new DefaultClientTransportSession(injector, socket,
            injector.get(options.encodingsFactory ?? TransportEncodingsFactory).create(injector, options),
            injector.get(options.decodingsFactory ?? TransportDecodingsFactory).create(injector, options),
            injector.get(StreamAdapter),
            injector.get(StatusAdapter, null),
            injector.get(Redirector, null),
            injector.get(MessageReader),
            injector.get(MessageWriter),
            injector.get(MessageFactory),
            injector.get(ClientIncomingFactory),
            injector.get(ResponseFactory),
            options);
    }

}