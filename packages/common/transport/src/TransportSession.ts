import { Abstract, ProvdierOf, Token } from '@tsdi/ioc';
import { Interceptor } from '@tsdi/core';
import { TransportErrorResponse, TransportEvent, HeadersLike,  } from '@tsdi/common';
import { Observable, finalize, mergeMap, share } from 'rxjs';
import { HybirdTransport, Transport } from './protocols';
import { CodingsOpts } from './codings/mappings';
import { EncodingsFactory } from './codings/encodings';
import { DecodingsFactory } from './codings/decodings';
import { Decoder, Encoder, CodingsContext } from './codings/codings';



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

    /**
     * packet delimiter flag
     */
    delimiter?: string;

    headDelimiter?: string;

    timeout?: number;
    /**
     * packet max size limit.
     */
    maxSize?: number;
}

/**
 * asset transport options.
 */
export interface AssetTransportOpts extends TransportOpts {
    /**
     * head delimiter flag
     */
    headDelimiter?: string;
    /**
     * payload max size limit.
     */
    payloadMaxSize?: number;
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

/**
 * base transport session.
 */
export abstract class BaseTransportSession<TSocket = any, TInput = any, TOutput = any, TMsg = any> {
    /**
     * socket.
     */
    abstract get socket(): TSocket;
    /**
     * transport options.
     */
    abstract get options(): TransportOpts;

    /**
     * encodings
     */
    abstract get encodings(): Encoder;
    /**
     * decodings
     */
    abstract get decodings(): Decoder;

    /**
     * send.
     * @param data 
     */
    send(data: TInput, context?: CodingsContext): Observable<TMsg> {
        const ctx = context ?? new CodingsContext(this.options);
        return this.encodings.encode(data, ctx)
            .pipe(
                mergeMap(msg => this.sendMessage(data, msg as TMsg)),
                finalize(() => !context && ctx.onDestroy()),
                share()
            )
    }

    abstract sendMessage(data: TInput, msg: TMsg): Observable<TMsg>;

    /**
     * receive
     * @param req the message response for.
     */
    receive(context?: CodingsContext): Observable<TOutput> {
        return this.handleMessage()
            .pipe(
                mergeMap(msg => {
                    const ctx = context ?? new CodingsContext(this.options);
                    return this.decodings.decode(msg, ctx)
                        .pipe(
                            finalize(() => !context && ctx.onDestroy())
                        )
                }),
                share()
            )
    }

    /**
     * handle message
     */
    abstract handleMessage(): Observable<TMsg>;

    /**
     * destroy.
     */
    abstract destroy(): Promise<void>;

}
