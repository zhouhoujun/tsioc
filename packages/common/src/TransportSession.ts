import { Abstract, Injector } from '@tsdi/ioc';
import { Packet, StatusCode } from './packet';
import { HybirdTransport, Transport } from './protocols';
import { TransportErrorResponse, TransportEvent } from './response';
import { OutgoingHeaders, ResHeaders } from './headers';
import { StreamAdapter } from './StreamAdapter';
import { Observable } from 'rxjs';



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
    abstract createErrorResponse(options: { url?: string | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: StatusCode; error?: any; statusText?: string | undefined; statusMessage?: string | undefined; }): TErrorResponse;
    abstract createHeadResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: StatusCode; statusText?: string | undefined; statusMessage?: string | undefined; }): TResponse;
    abstract createResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: StatusCode; statusText?: string | undefined; statusMessage?: string | undefined; body?: any; payload?: any; }): TResponse;
}

/**
 * buffer unpacker.
 */
export abstract class BufferUnpacker<TMessage = any> {
    /**
     * ubpack message to full packet buffers
     * @param msg 
     */
    abstract unpack(msg: TMessage): Observable<Buffer>;
}


/**
 * transport session.
 */
@Abstract()
export abstract class TransportSession<TSocket = any, TMessage = any>  {
    /**
     * packet buffer delimiter.
     */
    delimiter?: Buffer;
    /**
     * packet header delimiter.
     */
    headerDelimiter?: Buffer;
    /**
     * exist header in Origin message or not.
     */
    existHeader?: boolean;
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
     * generate header.
     * @param packet 
     */
    abstract generateHeader(msg: TMessage): Buffer;
    /**
     * parse header.
     * @param packet 
     */
    abstract parseHeader(msg: TMessage| Buffer): Packet;
    /**
     * send message
     * @param ctx 
     */
    abstract send(msg: TMessage): Observable<any>;
    /**
     * destroy.
     */
    abstract destroy(): Promise<void>;

}



// /**
//  * transport session.
//  */
// @Abstract()
// export abstract class ClientTransportSession<TSocket = any> extends TransportSession<TSocket>  {
//     /**
//      * send.
//      * @param packet 
//      */
//     abstract send(packet: TransportRequest): Observable<any>;
//     /**
//      * request.
//      * @param packet 
//      */
//     abstract request(packet: TransportRequest): Observable<TransportEvent>;
// }

// /**
//  * transport session.
//  */
// @Abstract()
// export abstract class ServerTransportSession<TSocket = any> extends TransportSession<TSocket> {
//     /**
//      * send.
//      * @param packet 
//      */
//     abstract send(packet: ResponsePacket): Observable<any>;

//     /**
//      * receive
//      */
//     abstract receive(packet?: Packet): Observable<IncomingPacket>;

// }


// /**
//  * client transport session factory.
//  */
// @Abstract()
// export abstract class ClientTransportSessionFactory<TSocket = any> {
//     /**
//      * injector.
//      */
//     abstract get injector(): Injector;
//     /**
//      * create transport session.
//      * @param options 
//      */
//     abstract create(socket: TSocket, options: TransportOpts): ClientTransportSession<TSocket>;
// }

// /**
//  * server transport session factory.
//  */
// @Abstract()
// export abstract class ServerTransportSessionFactory<TSocket = any> {
//     /**
//      * injector.
//      */
//     abstract get injector(): Injector;
//     /**
//      * create transport session.
//      * @param options 
//      */
//     abstract create(socket: TSocket, options: TransportOpts): ServerTransportSession<TSocket>;
// }
