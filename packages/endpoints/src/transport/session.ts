import { Abstract, Injector } from '@tsdi/ioc';
import { IReadableStream, IncomingPacket, TransportOpts, TransportSession } from '@tsdi/common';
import { TransportContext } from '../TransportContext';
import { Observable } from 'rxjs';
import { ServerOpts } from '../Server';

/**
 * incoming context.
 */
export interface IncomingContext {
    session: ServerTransportSession;
    options: ServerOpts;
    /**
     * packet ready.
     */
    ready?: boolean;
    packet?: IncomingPacket;
    raw?: Buffer | IReadableStream;
}


/**
 * transport session.
 */
@Abstract()
export abstract class ServerTransportSession<TSocket = any, TContext extends TransportContext = TransportContext> extends TransportSession<TSocket, TContext> {
    /**
     * send.
     * @param packet 
     */
    abstract send(ctx: TContext): Observable<any>;

    /**
     * receive
     */
    abstract receive(options: ServerOpts): Observable<TContext>;

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



