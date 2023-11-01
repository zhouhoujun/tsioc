import { Abstract, Injector, InvocationContext } from '@tsdi/ioc';
import { Packet, RequestPacket, ResponsePacket, StatusCode } from './packet';
import { Observable } from 'rxjs';
import { HybirdTransport, Transport } from './protocols';
import { TransportErrorResponse, TransportEvent } from './response';
import { OutgoingHeaders, ResHeaders } from './headers';
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
export interface ResponseEventFactory<TResponse = TransportEvent, TErrorResponse = TransportErrorResponse> {
    createErrorResponse(options: { url?: string | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: StatusCode; error?: any; statusText?: string | undefined; statusMessage?: string | undefined; }): TErrorResponse;
    createHeadResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: StatusCode; statusText?: string | undefined; statusMessage?: string | undefined; }): TResponse;
    createResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: StatusCode; statusText?: string | undefined; statusMessage?: string | undefined; body?: any; payload?: any; }): TResponse;
}



/**
 * transport session.
 */
@Abstract()
export abstract class TransportSession<TSocket = any>  {
    /**
     * injector.
     */
    abstract get injector(): Injector;
    /**
     * socket.
     */
    abstract get socket(): TSocket;
    /**
     * transport options.
     */
    abstract get options(): TransportOpts;
    /**
     * stream adapter
     */
    abstract get streamAdapter(): StreamAdapter;
    /**
     * get packet strategy
     */
    abstract getPacketStrategy(): string | undefined;
    /**
     * send.
     * @param packet 
     */
    abstract send(packet: RequestPacket, context?: InvocationContext): Observable<any>;
    /**
     * send.
     * @param packet 
     */
    abstract send(packet: ResponsePacket): Observable<any>;

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
     * request.
     * @param packet 
     */
    abstract request(packet: RequestPacket, context?: InvocationContext): Observable<ResponsePacket>;

    /**
     * receive
     */
    abstract receive(packet?: Packet): Observable<Packet>;

    /**
     * destroy.
     */
    abstract destroy(): Promise<void>;

}

/**
 * transport session factory.
 */
@Abstract()
export abstract class TransportSessionFactory<TSocket = any> {
    /**
     * injector.
     */
    abstract get injector(): Injector;
    /**
     * create transport session.
     * @param options 
     */
    abstract create(socket: TSocket, options: TransportOpts): TransportSession<TSocket>;
}
