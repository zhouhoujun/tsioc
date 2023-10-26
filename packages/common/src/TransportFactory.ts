import { Abstract, Injector } from '@tsdi/ioc';
import { Receiver } from './Receiver';
import { Sender } from './Sender';
import { Packet, RequestPacket, ResponsePacket, StatusCode } from './packet';
import { Observable } from 'rxjs';
import { Transport } from './protocols';
import { TransportEvent } from './response';
import { OutgoingHeaders, ResHeaders } from './headers';




/**
 * transport options.
 */
export interface TransportOpts {
    /**
     * transport type.
     */
    transport?: Transport;
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
 * Transport Factory.
 */
@Abstract()
export abstract class TransportFactory {
    /**
     * create receiver.
     * @param options 
     */
    abstract createReceiver(options: TransportOpts): Receiver
    /**
     * create sender.
     * @param options 
     */
    abstract createSender(options: TransportOpts): Sender;
}

/**
 * response factory.
 */
export interface ResponseFactory<TResponse = TransportEvent> {
    createErrorResponse(options: { url?: string | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: StatusCode; error?: any; statusText?: string | undefined; statusMessage?: string | undefined; }): TResponse
    createHeadResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: StatusCode; statusText?: string | undefined; statusMessage?: string | undefined; }): TResponse
    createResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: StatusCode; statusText?: string | undefined; statusMessage?: string | undefined; body?: any; payload?: any; }): TResponse
}




@Abstract()
export abstract class TransportSession<TSocket = any, TMsg = any>  {
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
     * send.
     * @param packet 
     */
    abstract send(packet: RequestPacket | ResponsePacket): Observable<any>;

    abstract serialize(packet: Packet, withPayload?: boolean): Buffer;

    abstract deserialize(raw: Buffer): Packet;

    /**
     * request.
     * @param packet 
     */
    abstract request(packet: RequestPacket): Observable<ResponsePacket>;

    /**
     * receive
     */
    abstract receive(filter?: (msg: TMsg) => boolean): Observable<Packet>;

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
