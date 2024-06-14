import { Injector, Token } from '@tsdi/ioc';
import { HeaderFields, Transport, HybirdTransport, MessageFactory, Message } from '@tsdi/common';
import { CodingsOpts, EncodingsFactory, DecodingsFactory } from '@tsdi/common/codings';
import { Observable } from 'rxjs';
import { TransportContext } from './context';
import { StreamAdapter } from './StreamAdapter';
import { StatusAdapter } from './StatusAdapter';
import { AbstractIncomingFactory } from './Incoming';


/**
 * transport options.
 */
export interface TransportOpts extends CodingsOpts {

    /**
     * encodings Factory.
     */
    readonly encodingsFactory?: Token<EncodingsFactory>;

    /**
     * decodings Factory.
     */
    readonly decodingsFactory?: Token<DecodingsFactory>;

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
     * message event of socket.
     */
    readonly messageEvent?: string;
    /**
     * message event handle of socket.
     * @param args 
     */
    messageEventHandle?(...args: any[]): any;

    /**
     * pipe endcoed data to socket
     * @param socket 
     * @param msg 
     * @param input 
     * @param ctx 
     */
    pipeTo?(socket: any, msg: Message, input: any, ctx: TransportContext): Promise<void>;
    /**
     * write endcoed data to socket.
     * @param socket 
     * @param msg 
     * @param input 
     * @param ctx 
     * @param cb 
     */
    write?(socket: any, msg: Message, input: any, ctx: TransportContext, cb?: (err?: Error | null) => void): void;

    /**
     * custom handle mesasge from socket.
     * 
     * @param socket
     * @param factory 
     * @param context 
     */
    handleMessage?(socket: any, factory: MessageFactory, context?: TransportContext): Observable<any>;

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
