import { Abstract, Token } from '@tsdi/ioc';
import { TransportErrorResponse, TransportEvent, HeadersLike, Encoder, Decoder, InputContext } from '@tsdi/common';
import { Observable, finalize, mergeMap, of, share } from 'rxjs';
import { HybirdTransport, Transport } from './protocols';




/**
 * transport options.
 */
export interface TransportOpts {
    /**
     * transport type.
     */
    transport?: Transport | HybirdTransport;
    /**
     * encodings.
     */
    encodings?: Token<Encoder[]>;
    /**
     * decodings.
     */
    decodings?: Token<Decoder[]>;
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
    abstract get encodings(): Encoder[];
    /**
     * decodings
     */
    abstract get decodings(): Decoder[];

    /**
     * send.
     * @param data 
     */
    send(data: TInput, context?: InputContext): Observable<TMsg> {
        const ctx = context ?? new InputContext();
        return this.encodings.reduceRight((obs$, curr) => {
            return obs$.pipe(
                mergeMap(input => curr.encode(input, ctx.next(input)))
            );
        }, of(data as any))
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
    receive(context?: InputContext): Observable<TOutput> {
        return this.handleMessage()
            .pipe(
                mergeMap(msg => {
                    const ctx = context ?? new InputContext();

                    return this.decodings.reduceRight((obs$, curr) => {
                        return obs$.pipe(
                            mergeMap(input => curr.decode(input, ctx.next(input)))
                        );
                    }, of(msg as any))
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
