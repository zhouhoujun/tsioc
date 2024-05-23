import { Abstract, Injector, Token } from '@tsdi/ioc';
import { TransportErrorResponse, TransportEvent, HeadersLike, HeaderFields, Transport, HybirdTransport, } from '@tsdi/common';
import { CodingsOpts, EncodingsFactory, DecodingsFactory } from '@tsdi/common/codings';
import { Observable } from 'rxjs';
import { IReadableStream } from './stream';
import { TransportContext } from './context';

/**
 * tranport base options.
 */
export interface TransportBaseOpts {
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
 * transport codings options.
 */
export interface TransportCodingsOpts extends CodingsOpts, TransportBaseOpts {

}

/**
 * transport options.
 */
export interface TransportOpts extends TransportBaseOpts {

    encodings?: CodingsOpts;
    /**
     * encodings Factory.
     */
    readonly encodingsFactory?: Token<EncodingsFactory>;


    decodings?: CodingsOpts;
    /**
     * decodings Factory.
     */
    readonly decodingsFactory?: Token<DecodingsFactory>;

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



/**
 * response factory.
 */
@Abstract()
export abstract class ResponseEventFactory<TResponse = TransportEvent, TErrorResponse = TransportErrorResponse, TStatus = any> {
    abstract createErrorResponse(options: { url?: string; headers?: HeadersLike; status?: TStatus; error?: any; statusText?: string; statusMessage?: string; }): TErrorResponse;
    abstract createHeadResponse(options: { url?: string; ok?: boolean; headers?: HeadersLike; status?: TStatus; statusText?: string; statusMessage?: string; }): TResponse;
    abstract createResponse(options: { url?: string; ok?: boolean; headers?: HeadersLike; status?: TStatus; statusText?: string; statusMessage?: string; body?: any; payload?: any; }): TResponse;
}
