import { Abstract, Injector } from '@tsdi/ioc';
import { Receiver } from './Receiver';
import { Sender } from './Sender';
import { RequestPacket, ResponsePacket } from './packet';
import { Observable } from 'rxjs';
import { Transport } from './protocols';
import { IncomingPacket } from './socket';




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
    abstract createReceiver<TSocket>(socket: TSocket, transport: Transport, options?: TransportOpts): Receiver<TSocket>;
    /**
     * create sender.
     * @param options 
     */
    abstract createSender<TSocket>(socket: TSocket, transport: Transport, options?: TransportOpts): Sender<TSocket>;
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

/**
 * transport session factory.
 */
@Abstract()
export abstract class TransportSessionFactory<TSocket = any> {
    /**
     * create transport session.
     * @param options 
     */
    abstract create(socket: TSocket, transport: Transport, options?: TransportOpts): TransportSession<TSocket>;
}
