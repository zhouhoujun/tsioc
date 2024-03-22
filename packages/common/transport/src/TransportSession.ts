import { Abstract, Injector, Token } from '@tsdi/ioc';
import { TransportErrorResponse, TransportEvent, HeadersLike, Encoder, Decoder, InputContext } from '@tsdi/common';
import { Observable, mergeMap, of, share } from 'rxjs';
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
     * server side or not.
     */
    serverSide?: boolean;
    /**
     * is microservice or not.
     */
    microservice?: boolean;
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
    /**
     * packet buffer encoding.
     */
    encoding?: BufferEncoding;
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
 * transport session.
 */
@Abstract()
export abstract class TransportSession<TInput = any, TOutput = any, TMsg = any, TSocket = any>  {
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
    send(data: TInput): Observable<TMsg> {
        const context = new InputContext();
        return this.encodings.reduceRight((obs$, curr) => {
            return obs$.pipe(
                mergeMap(input => curr.encode(input, context.next(input)))
            );
        }, of(data as any))
            .pipe(
                mergeMap(msg => this.sendMessage(data, msg as TMsg)),
                share()
            )
    }

    abstract sendMessage(data: TInput, msg: TMsg): Observable<TMsg>;

    /**
     * receive
     * @param req the message response for.
     */
    receive(req?: TMsg): Observable<TOutput> {
        const context = new InputContext();
        return this.handMessage()
            .pipe(
                mergeMap(msg => this.decodings.reduceRight((obs$, curr) => {
                    return obs$.pipe(
                        mergeMap(input => curr.decode(input, context.next(input)))
                    );
                }, of(msg as any))),
                share()
            )
    }

    abstract handMessage(): Observable<TMsg>;

    /**
     * destroy.
     */
    abstract destroy(): Promise<void>;

}


/**
 * transport session factory.
 */
@Abstract()
export abstract class TransportSessionFactory<TData = any, TMsg = any, TSocket = any> {
    /**
     * create transport session.
     * @param options 
     */
    abstract create(injector: Injector, socket: TSocket, options: TransportOpts): TransportSession<TData, TMsg, TSocket>;
}
