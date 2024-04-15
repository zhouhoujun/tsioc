import { Abstract, Injector, ProvdierOf, Token } from '@tsdi/ioc';
import { Interceptor } from '@tsdi/core';
import { TransportErrorResponse, TransportEvent, HeadersLike, HeaderFields,  } from '@tsdi/common';
import { Observable } from 'rxjs';
import { HybirdTransport, Transport } from './protocols';
import { CodingsOpts } from './codings/mappings';
import { EncodingsFactory } from './codings/encodings';
import { DecodingsFactory } from './codings/decodings';



/**
 * transport options.
 */
export interface TransportOpts extends CodingsOpts {
    /**
     * transport type.
     */
    transport?: Transport | HybirdTransport;
    /**
     * microservice or not.
     */
    microservice?: boolean;
    /**
     * encodings Factory.
     */
    encodingsFactory?: Token<EncodingsFactory>;
    /**
     * decodings Factory.
     */
    decodingsFactory?: Token<DecodingsFactory>;
    /**
     * encode interceptors
     */
    encodeInterceptors?: ProvdierOf<Interceptor>[];
    /**
     * encode prefix interceptors
     */
    decodeInterceptors?: ProvdierOf<Interceptor>[];

    headerFields?: HeaderFields;
    
    defaultMethod?: string;
    /**
     * packet delimiter flag
     */
    delimiter?: string;

    /**
     * head delimiter flag
     */
    headDelimiter?: string;

    timeout?: number;
    /**
     * packet max size limit.
     */
    maxSize?: number;
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
