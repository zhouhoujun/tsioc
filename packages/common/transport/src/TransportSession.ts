import { Abstract, InvocationContext } from '@tsdi/ioc';
import { TransportRequest, TransportErrorResponse, TransportEvent, HeadersLike, StatusCode } from '@tsdi/common';
import { HeaderPacket, Packet } from './packet';
import { Observable } from 'rxjs';
import { Incoming } from './incoming';
import { HybirdTransport, Transport } from './protocols';
import { StreamAdapter } from './StreamAdapter';




/**
 * transport options.
 */
export interface TransportOpts {
    /**
     * transport type.
     */
    transport?: Transport | HybirdTransport;
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
export abstract class ResponseEventFactory<TResponse = TransportEvent, TErrorResponse = TransportErrorResponse> {
    abstract createErrorResponse(options: { url?: string; headers?: HeadersLike; status?: StatusCode; error?: any; statusText?: string; statusMessage?: string; }): TErrorResponse;
    abstract createHeadResponse(options: { url?: string; ok?: boolean; headers?: HeadersLike; status?: StatusCode; statusText?: string; statusMessage?: string; }): TResponse;
    abstract createResponse(options: { url?: string; ok?: boolean; headers?: HeadersLike; status?: StatusCode; statusText?: string; statusMessage?: string; body?: any; payload?: any; }): TResponse;
}



/**
 * transport session.
 */
@Abstract()
export abstract class TransportSession<TSocket = any>  {
    /**
     * socket.
     */
    abstract get socket(): TSocket;
    /**
     * transport options.
     */
    abstract get options(): TransportOpts;
    /**
     * stream adapter.
     */
    abstract get streamAdapter(): StreamAdapter;
    /**
     * send.
     * @param packet 
     */
    abstract send(packet: Packet, context?: InvocationContext): Observable<any>;
    /**
     * serialize packet.
     * @param packet
     */
    abstract serialize(packet: Packet, withPayload?: boolean): Buffer;
    /**
     * deserialize packet.
     * @param raw 
     */
    abstract deserialize(raw: Buffer): Packet;

    /**
     * receive
     */
    abstract receive(packet?: HeaderPacket): Observable<Incoming>;

    /**
     * destroy.
     */
    abstract destroy(): Promise<void>;

}

/**
 * client transport session.
 */
@Abstract()
export abstract class ClientTransportSession<TSocket = any> extends TransportSession<TSocket> {

    /**
     * request.
     * @param packet 
     */
    abstract request(packet: TransportRequest, context?: InvocationContext): Observable<TransportEvent>;

}

/**
 * transport session factory.
 */
@Abstract()
export abstract class TransportSessionFactory<TSocket = any> {
    /**
     * create transport session.
     * @param options 
     */
    abstract create(socket: TSocket, options: TransportOpts): TransportSession<TSocket>;
}
