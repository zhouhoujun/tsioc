import { Abstract, Injector } from '@tsdi/ioc';
import { IncomingPacket, TransportOpts, TransportSession } from '@tsdi/common';
import { TransportContext } from '../TransportContext';
import { Observable } from 'rxjs';
import { ServerOpts } from '../Server';

/**
 * incoming context.
 */
export interface IncomingContext {
    session: ServerTransportSession;
    packet?: IncomingPacket;
    raw?: Buffer;
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
    abstract receive(options: ServerOpts): Observable<IncomingPacket>;

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



