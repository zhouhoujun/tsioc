import { Injector, Token } from '@tsdi/ioc';
import { HeaderFields, Transport, HybirdTransport } from '@tsdi/common';
import { CodingsOpts, EncodingsFactory, DecodingsFactory } from '@tsdi/common/codings';
import { Observable } from 'rxjs';
import { IReadableStream } from './stream';
import { TransportContext } from './context';


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
     * @param data 
     * @param originData 
     * @param ctx 
     */
    pipeTo?(socket: any, data: IReadableStream, originData: any, ctx: TransportContext): Promise<void>;
    /**
     * write endcoed data to socket.
     * @param socket 
     * @param data 
     * @param originData 
     * @param ctx 
     * @param cb 
     */
    write?(socket: any, data: any, originData: any, ctx: TransportContext, cb?: (err?: Error | null) => void): void;

    /**
     * custom handle mesasge from socket.
     * 
     * @param socket 
     * @param context 
     */
    handleMessage?(socket: any, context?: TransportContext): Observable<any>;

}


/**
 * base transport session.
 */
export abstract class AbstractTransportSession<TSocket = any, TInput = any, TOutput = any, TMsg = any, TContext = any> {
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
     * send.
     * @param data 
     */
    abstract send(data: TInput, context?: TContext): Observable<TMsg>;

    /**
     * receive
     * @param req the message response for.
     */
    abstract receive(context?: TContext): Observable<TOutput>;

    /**
     * destroy.
     */
    abstract destroy(): Promise<void>;

}
