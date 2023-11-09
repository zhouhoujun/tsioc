import { Abstract, Injector } from '@tsdi/ioc';
import { IncomingPacket, Packet, TransportOpts, TransportSession } from '@tsdi/common';
import { TransportContext } from '../TransportContext';
import { Observable } from 'rxjs';

/**
 * incoming context.
 */
export interface IncomingContext extends IncomingPacket {
    session: ServerTransportSession;
}


/**
 * transport session.
 */
@Abstract()
export abstract class ServerTransportSession<TSocket = any> extends TransportSession<TSocket, TransportContext> {
    /**
     * send.
     * @param packet 
     */
    abstract send(ctx: TransportContext): Observable<any>;

    /**
     * receive
     */
    abstract receive(packet?: Packet): Observable<IncomingPacket>;

}

/**
 * server transport session factory.
 */
@Abstract()
export abstract class ServerTransportSessionFactory<TSocket = any> {
    /**
     * injector.
     */
    abstract get injector(): Injector;
    /**
     * create transport session.
     * @param options 
     */
    abstract create(socket: TSocket, options: TransportOpts): ServerTransportSession<TSocket>;
}


