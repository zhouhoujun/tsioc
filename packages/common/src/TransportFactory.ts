import { Abstract, Injector } from '@tsdi/ioc';
import { Receiver } from './Receiver';
import { Sender } from './Sender';
import { Packet, RequestPacket, ResponsePacket } from './packet';
import { Observable } from 'rxjs';
import { Transport } from './protocols';
import { Incoming, Outgoing } from './socket';
import { IncomingHeaders } from './headers';



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
     * packet size limit.
     */
    limit?: number;
    /**
     * payload max size limit.
     */
    maxSize?: number;
    /**
     * packet buffer encoding.
     */
    encoding?: BufferEncoding;
}

@Abstract()
export abstract class TransportFactory {
    /**
     * injector.
     */
    abstract get injector(): Injector;
    /**
     * create receiver.
     * @param options 
     */
    abstract createReceiver(transport: Transport, options?: TransportOpts): Receiver;
    /**
     * create sender.
     * @param options 
     */
    abstract createSender(transport: Transport, options?: TransportOpts): Sender;
}

/**
 * incoming packet.
 */
export interface IncomingPacket<T = any> extends Packet<T> {
    req?: Incoming;
    res?: Outgoing;
    headers?: IncomingHeaders;
    originalUrl?: string;
}

@Abstract()
export abstract class TransportSession<TSocket = any, TMsg = any>  {
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

    /**
     * request.
     * @param packet 
     */
    abstract request(packet: RequestPacket): Observable<ResponsePacket>;

    /**
     * receive
     */
    abstract receive(filter?: (msg: TMsg) => boolean): Observable<IncomingPacket>;

    /**
     * destroy.
     */
    abstract destroy(): Promise<void>;

}


@Abstract()
export abstract class TransportSessionFactory<TSocket = any> {
    /**
     * create transport session.
     * @param options 
     */
    abstract create(socket: TSocket, transport: Transport, options?: TransportOpts): TransportSession<TSocket>;
}
