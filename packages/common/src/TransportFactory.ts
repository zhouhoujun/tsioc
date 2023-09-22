import { Abstract, Injector } from '@tsdi/ioc';
import { Receiver } from './Receiver';
import { Sender } from './Sender';
import { IEventEmitter } from './stream';
import { Packet, RequestPacket, ResponsePacket } from './packet';
import { Observable } from 'rxjs';



/**
 * transport options.
 */
export interface TransportOpts {
    /**
     * server side or not.
     */
    serverSide?: boolean;
    /**
     * packet delimiter flag
     */
    delimiter?: string;
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
     * @param context 
     * @param decoder 
     * @param options 
     */
    abstract createReceiver(options: TransportOpts): Receiver;
    /**
     * create sender.
     * @param context 
     * @param encoder 
     * @param options 
     */
    abstract createSender(options: TransportOpts): Sender;
}


@Abstract()
export abstract class TransportSession<TSocket = any> {
    /**
     * socket.
     */
    abstract get socket(): TSocket;

    /**
     * packet sender
     */
    abstract get sender(): Sender;

    /**
     * packet receiver.
     */
    abstract get receiver(): Receiver;

    /**
     * send.
     * @param packet 
     */
    abstract send(packet: Packet): Observable<any>;

    /**
     * request.
     * @param packet 
     */
    abstract request(packet: RequestPacket): Observable<ResponsePacket>;

    abstract destroy():  Promise<void>;

}


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
    abstract create(socket: TSocket, options?: TransportOpts): TransportSession<TSocket>;
}
