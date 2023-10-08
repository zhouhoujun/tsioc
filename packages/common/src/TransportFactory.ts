import { Abstract, Injector } from '@tsdi/ioc';
import { Receiver } from './Receiver';
import { Sender } from './Sender';
import { RequestPacket, ResponsePacket } from './packet';
import { Observable } from 'rxjs';
import { Transport } from './protocols';



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
    abstract send(packet: ResponsePacket): Observable<any>;

    /**
     * request.
     * @param packet 
     */
    abstract request(packet: RequestPacket): Observable<ResponsePacket>;

    /**
     * receive
     */
    abstract receive(): Observable<ResponsePacket>;

    /**
     * destroy.
     */
    abstract destroy():  Promise<void>;

}


@Abstract()
export abstract class TransportSessionFactory<TSocket = any> {
    /**
     * create transport session.
     * @param options 
     */
    abstract create(socket: TSocket, transport: Transport, options?: TransportOpts): TransportSession<TSocket>;
}
