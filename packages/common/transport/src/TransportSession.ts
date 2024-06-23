import { HeaderFields, HybirdTransport, Message, MessageFactory, Transport } from '@tsdi/common';
import { CodingsHandlerOptions } from '@tsdi/common/codings';
import { Injector, Token } from '@tsdi/ioc';
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

    readonly encoding?: string;

    readonly timeout?: number;

    /**
     * pipe endcoed data to socket
     * @param socket 
     * @param msg 
     * @param input
     */
    pipeTo?(socket: any, msg: Message, input: any): Promise<void>;
    /**
     * write endcoed data to socket.
     * @param socket 
     * @param msg 
     * @param input 
     * @param ctx 
     * @param cb 
     */
    write?(socket: any, msg: Message, input: any, cb?: (err?: Error | null) => void): void;

    /**
     * custom handle mesasge from socket.
     * 
     * @param socket
     * @param factory 
     * @param context 
     */
    handleMessage?(socket: any, factory: MessageFactory): Observable<any>;

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
     * send.
     * @param data 
     */
    abstract send(data: TInput, context?: TransportContext): Observable<TMsg>;

    /**
     * receive
     * @param req the message response for.
     */
    abstract receive(context?: TransportContext): Observable<TOutput>;

    /**
     * destroy.
     */
    abstract destroy(): Promise<void>;

}
