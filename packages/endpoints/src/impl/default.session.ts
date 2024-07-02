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

    private _encodings?: TransportEncodings;
    private _decodings?: TransportDecodings;
    private _streamAdapter?: StreamAdapter;
    private _fileAdapter?: FileAdapter;
    private _mimeAdapter?: MimeAdapter | null;
    private _acceptsPriority?: AcceptsPriority | null;
    private _statusAdapter?: StatusAdapter | null;
    private _messageReader?: MessageReader;
    private _messageWriter?: MessageWriter;
    private _messageFactory?: MessageFactory;
    private _incomingFactory?: IncomingFactory;
    private _outgoingFactory?: OutgoingFactory;
    private _requestContextFactory?: RequestContextFactory;

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

    get fileAdapter(): FileAdapter {
        if (!this._fileAdapter) {
            this._fileAdapter = this.injector.get(FileAdapter)
        }
        return this._fileAdapter;
    }

    get mimeAdapter(): MimeAdapter | null {
        if (this._mimeAdapter === undefined) {
            this._mimeAdapter = this.injector.get(MimeAdapter, null)
        }
        return this._mimeAdapter;
    }

    get acceptsPriority(): AcceptsPriority | null {
        if (this._acceptsPriority === undefined) {
            this._acceptsPriority = this.injector.get(AcceptsPriority, null)
        }
        return this._acceptsPriority;
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
    get messageFactory(): MessageFactory {
        if (!this._messageFactory) {
            this._messageFactory = this.injector.get(MessageFactory)
        }
        return this._messageFactory;
    }
    get incomingFactory(): IncomingFactory {
        if (!this._incomingFactory) {
            this._incomingFactory = this.injector.get(IncomingFactory)
        }
        return this._incomingFactory;
    }
    get outgoingFactory(): OutgoingFactory {
        if (!this._outgoingFactory) {
            this._outgoingFactory = this.injector.get(OutgoingFactory)
        }
        return this._outgoingFactory;
    }
    get requestContextFactory(): RequestContextFactory {
        if (!this._requestContextFactory) {
            this._requestContextFactory = this.injector.get(RequestContextFactory)
        }
        return this._requestContextFactory;
    }

    get options(): TransportOpts {
        return this.serverOptions.transportOpts!
    }

    constructor(
        readonly injector: Injector,
        readonly socket: any,
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
        return new DefaultTransportSession(injector, socket, options);
    }

}
