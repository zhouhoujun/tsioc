import { MessageFactory, ResponseFactory } from '@tsdi/common';
import { ClientIncomingFactory, IDuplexStream, MessageReader, MessageWriter, Redirector, StatusAdapter, StreamAdapter, TransportDecodings, TransportDecodingsFactory, TransportEncodings, TransportEncodingsFactory, TransportOpts } from '@tsdi/common/transport';
import { Injectable, Injector } from '@tsdi/ioc';
import { ClientTransportSession, ClientTransportSessionFactory } from './session';
import { ClientOpts } from './options';



export class DefaultClientTransportSession extends ClientTransportSession<any> {

    private _encodings?: TransportEncodings;
    private _decodings?: TransportDecodings;
    private _streamAdapter?: StreamAdapter;
    private _statusAdapter?: StatusAdapter | null;
    private _incomingFactory?: ClientIncomingFactory;
    private _messageReader?: MessageReader;
    private _messageWriter?: MessageWriter;
    private _messageFactory?: MessageFactory | null;
    private _responseFactory?: ResponseFactory;
    private _redirector?: Redirector | null;

    get options(): TransportOpts {
        return this.clientOptions.transportOpts!
    }

    get encodings(): TransportEncodings {
        if (!this._encodings) {
            this._encodings = this.injector.get(this.options.encodingsFactory ?? TransportEncodingsFactory)
                .create(this.injector, this.options)
        }
        return this._encodings;
    }
    get decodings(): TransportDecodings {
        if (!this._decodings) {
            this._decodings = this.injector.get(this.options.decodingsFactory ?? TransportDecodingsFactory)
                .create(this.injector, this.options)
        }
        return this._decodings;
    }

    get streamAdapter(): StreamAdapter {
        if (!this._streamAdapter) {
            this._streamAdapter = this.injector.get(StreamAdapter)
        }
        return this._streamAdapter;
    }

    get statusAdapter(): StatusAdapter | null {
        if (this._statusAdapter === undefined) {
            this._statusAdapter = this.injector.get(StatusAdapter, null)
        }
        return this._statusAdapter;
    }
    get messageReader(): MessageReader {
        if (!this._messageReader) {
            this._messageReader = this.injector.get(MessageReader)
        }
        return this._messageReader;
    }
    get messageWriter(): MessageWriter {
        if (!this._messageWriter) {
            this._messageWriter = this.injector.get(MessageWriter)
        }
        return this._messageWriter;
    }
    get messageFactory(): MessageFactory | null {
        if (this._messageFactory === undefined) {
            this._messageFactory = this.injector.get(MessageFactory, null)
        }
        return this._messageFactory;
    }
    get incomingFactory(): ClientIncomingFactory {
        if (!this._incomingFactory) {
            this._incomingFactory = this.injector.get(ClientIncomingFactory)
        }
        return this._incomingFactory;
    }
    get responseFactory(): ResponseFactory {
        if (!this._responseFactory) {
            this._responseFactory = this.injector.get(ResponseFactory)
        }
        return this._responseFactory;
    }
    get redirector(): Redirector | null {
        if (this._redirector === undefined) {
            this._redirector = this.injector.get(Redirector, null)
        }
        return this._redirector;
    }

    constructor(
        readonly injector: Injector,
        readonly socket: any,
        readonly clientOptions: ClientOpts

    ) {
        super()
        this.encodings.session = this.decodings.session = this;
    }

}


@Injectable()
export class DefaultClientTransportSessionFactory implements ClientTransportSessionFactory<any> {

    constructor() { }

    create(injector: Injector, socket: IDuplexStream, options: ClientOpts): DefaultClientTransportSession {
        return new DefaultClientTransportSession(injector, socket, options);
    }

}