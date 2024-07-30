import { HeaderAdapter, HybirdTransport, Message, MessageFactory, Transport } from '@tsdi/common';
import { CodingsAapter, CodingsHandlerOptions } from '@tsdi/common/codings';
import { Abstract, Injector, ProvdierOf, Token } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { AbstractIncomingFactory, ClientIncoming, Incoming } from './Incoming';
import { StatusAdapter } from './StatusAdapter';
import { StreamAdapter } from './StreamAdapter';
import { TransportDecodingsFactory, TransportEncodingsFactory } from './condings';
import { IEventEmitter } from './stream';
import { Outgoing } from './Outgoing';



/**
 * transport options.
 */
export interface TransportOpts {
    /**
     * the codings action name.
     */
    name?: string;
    /**
     * subfix of group.
     */
    subfix?: string;

    encodings?: CodingsHandlerOptions;
    decodings?: CodingsHandlerOptions;

    encodingsAdapter?: ProvdierOf<CodingsAapter>;
    decodingsAdapter?: ProvdierOf<CodingsAapter>;
    /**
     * encodings Factory.
     */
    encodingsFactory?: Token<TransportEncodingsFactory>;
    /**
     * decodings Factory.
     */
    decodingsFactory?: Token<TransportDecodingsFactory>;

    /**
     * transport type.
     */
    transport?: Transport | HybirdTransport;
    /**
     * microservice or not.
     */
    microservice?: boolean;

    client?: boolean;

    defaultMethod?: string;

    serializeIgnores?: string[];

    /**
     * packet delimiter flag
     */
    delimiter?: string;

    /**
     * head delimiter flag
     */
    headDelimiter?: string;

    /**
     * content count number length.
     */
    countLen?: number;
    /**
     * id b
     */
    idLen?: number;
    /**
     * packet max size limit.
     */
    maxSize?: number;
    /**
     * encoding
     */
    encoding?: string;
    /**
     * timeout
     */
    timeout?: number;

}


/**
 * base transport session.
 */
export abstract class AbstractTransportSession<TSocket = any, TInput = any, TOutput = any> {
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
    abstract get messageFactory(): MessageFactory | null;
    /**
     * incoming message factory.
     */
    abstract get incomingFactory(): AbstractIncomingFactory;
    /**
     * stream adapter.
     */
    abstract get streamAdapter(): StreamAdapter;
    /**
     * header adapter.
     */
    abstract get headerAdapter(): HeaderAdapter;
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
    abstract send(data: TInput, channel?: IEventEmitter): Observable<any>;

    /**
     * receive
     * @param channel the req channel.
     * @param req the message response for.
     */
    abstract receive(channel?: IEventEmitter, req?: TInput): Observable<TOutput>;

    /**
     * destroy.
     */
    abstract destroy(): Promise<void>;

}


/**
 * Incoming messages
 */
export type Incomings = Message | Incoming<any> | ClientIncoming<any>;


/**
 * Outgoing messages
 */
export type Outgoings = Message | Outgoing<any>;


/**
 * message reader.
 */
@Abstract()
export abstract class MessageReader<TSocket = any, TChannel extends IEventEmitter = IEventEmitter, TMsg = any, TSession extends AbstractTransportSession = AbstractTransportSession> {
    abstract read(socket: TSocket, channel: TChannel | null | undefined, session: TSession): Observable<TMsg>

}

/**
 * message writer.
 */
@Abstract()
export abstract class MessageWriter<TSocket = any, TChannel extends IEventEmitter = IEventEmitter, TMsg = any, TOrigin = any, TSession extends AbstractTransportSession = AbstractTransportSession> {
    abstract write(socket: TSocket, channel: TChannel | null | undefined, msg: TMsg, origin: TOrigin, session: TSession): Promise<any>;
}
