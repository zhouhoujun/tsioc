import { HeaderFields, HybirdTransport, Message, MessageFactory, Transport } from '@tsdi/common';
import { CodingsHandlerOptions } from '@tsdi/common/codings';
import { Abstract, Injector, Token } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { AbstractIncomingFactory } from './Incoming';
import { StatusAdapter } from './StatusAdapter';
import { StreamAdapter } from './StreamAdapter';
import { TransportDecodingsFactory, TransportEncodingsFactory } from './condings';
import { TransportContext } from './context';



/**
 * transport options.
 */
export interface TransportOpts {
    /**
     * the codings action name.
     */
    readonly name?: string;
    /**
     * subfix of group.
     */
    readonly subfix?: string;

    readonly encodings?: CodingsHandlerOptions;
    readonly decodings?: CodingsHandlerOptions;

    /**
     * encodings Factory.
     */
    readonly encodingsFactory?: Token<TransportEncodingsFactory>;
    /**
     * decodings Factory.
     */
    readonly decodingsFactory?: Token<TransportDecodingsFactory>;

    /**
     * transport type.
     */
    readonly transport?: Transport | HybirdTransport;
    /**
     * microservice or not.
     */
    readonly microservice?: boolean;

    readonly client?: boolean;

    readonly headerFields?: HeaderFields;

    readonly defaultMethod?: string;

    readonly serializeIgnores?: string[];

    /**
     * packet delimiter flag
     */
    readonly delimiter?: string;

    /**
     * head delimiter flag
     */
    readonly headDelimiter?: string;

    /**
     * content count number length.
     */
    readonly countLen?: number;
    /**
     * id b
     */
    readonly idLen?: number;
    /**
     * packet max size limit.
     */
    readonly maxSize?: number;
    /**
     * encoding
     */
    readonly encoding?: string;
    /**
     * timeout
     */
    readonly timeout?: number;

}


/**
 * base transport session.
 */
export abstract class AbstractTransportSession<TSocket = any, TInput = any, TOutput = any, TMsg = any> {
    /**
     * socket.
     */
    abstract get socket(): TSocket;
    /**
     * transport options.
     */
    abstract get options(): TransportOpts;
    /**
     * session context.
     */
    abstract get injector(): Injector;
    /**
     * message factory.
     */
    abstract get messageFactory(): MessageFactory;
    /**
     * incoming message factory.
     */
    abstract get incomingFactory(): AbstractIncomingFactory;
    /**
     * stream adapter.
     */
    abstract get streamAdapter(): StreamAdapter;
    /**
     * status adapter.
     */
    abstract get statusAdapter(): StatusAdapter | null;
    /**
     * message reader.
     */
    abstract get messageReader(): MessageReader;

    /**
     * message writer.
     */
    abstract get messageWriter(): MessageWriter;
    /**
     * send.
     * @param data 
     */
    abstract send(data: TInput, context?: TransportContext): Observable<TMsg>;

    /**
     * receive
     * @param req the message response for.
     */
    abstract receive(req?: TInput): Observable<TOutput>;

    /**
     * destroy.
     */
    abstract destroy(): Promise<void>;

}

@Abstract()
export abstract class MessageReader<TSocket = any, TMsg extends Message = Message, TSession extends AbstractTransportSession = AbstractTransportSession> {
    abstract read(socket: TSocket, messageFactory: MessageFactory, session: TSession): Observable<TMsg>
}

@Abstract()
export abstract class MessageWriter<TSocket = any, TMsg extends Message = Message, TOrigin = any, TSession extends AbstractTransportSession = AbstractTransportSession> {
    abstract write(socket: TSocket, msg: TMsg, origin: TOrigin, session: TSession): Promise<any>;
}
