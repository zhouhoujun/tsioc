import { Abstract, Injector, InvocationContext, Token } from '@tsdi/ioc';
import { TransportErrorResponse, TransportEvent, HeadersLike, Encoder, Decoder, TransportResponse } from '@tsdi/common';
import { HeaderPacket } from './packet';
import { Observable } from 'rxjs';
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
export abstract class ResponseEventFactory<TResponse = TransportEvent, TErrorResponse= TransportErrorResponse, TStatus = any> {
    abstract createErrorResponse(options: { url?: string; headers?: HeadersLike; status?: TStatus; error?: any; statusText?: string; statusMessage?: string; }): TErrorResponse;
    abstract createHeadResponse(options: { url?: string; ok?: boolean; headers?: HeadersLike; status?: TStatus; statusText?: string; statusMessage?: string; }): TResponse;
    abstract createResponse(options: { url?: string; ok?: boolean; headers?: HeadersLike; status?: TStatus; statusText?: string; statusMessage?: string; body?: any; payload?: any; }): TResponse;
}



/**
 * transport session.
 */
@Abstract()
export abstract class TransportSession<TIncoming = any, TOutgoing = any, TSocket = any>  {
    /**
     * socket.
     */
    abstract get socket(): TSocket;
    /**
     * transport options.
     */
    abstract get options(): TransportOpts;

    /**
     * send.
     * @param packet 
     */
    abstract send(packet: TOutgoing, context?: InvocationContext): Observable<any>;

    /**
     * receive
     */
    abstract receive(packet?: HeaderPacket): Observable<TIncoming>;

    /**
     * destroy.
     */
    abstract destroy(): Promise<void>;

}


/**
 * transport session factory.
 */
@Abstract()
export abstract class TransportSessionFactory<TIncoming = any, TOutgoing = any, TSocket = any> {
    /**
     * create transport session.
     * @param options 
     */
    abstract create(injector: Injector, socket: TSocket, options: TransportOpts): TransportSession<TIncoming, TOutgoing, TSocket>;
}


// /**
//  * client transport session.
//  */
// @Abstract()
// export abstract class ClientTransportSession<TSocket = any> extends TransportSession<TSocket> {

//     /**
//      * request.
//      * @param packet 
//      */
//     abstract request(packet: TransportRequest, context?: InvocationContext): Observable<TransportEvent>;

// }

// /**
//  * Server side transport session.
//  */
// @Abstract()
// export abstract class ServerTransportSession<TSocket = any, TOption = any> extends TransportSession<TSocket> {

//     /**
//      * handle
//      */
//     abstract handle(handler: Handler, options: TOption): Subscription;
// }
