import { Abstract, Injector } from '@tsdi/ioc';
import { FileAdapter, ResponsePacket, TransportOpts, TransportSession } from '@tsdi/common';
import { TransportContext } from '../TransportContext';
import { Observable } from 'rxjs';
import { ServerOpts } from '../Server';


/**
 * transport session.
 */
@Abstract()
export abstract class ServerTransportSession<TSocket = any, TContext extends TransportContext = TransportContext> extends TransportSession<TSocket, TContext> {

    /**
     * file adapter
     */
    abstract get fileAdapter(): FileAdapter;
    /**
     * send.
     * @param packet 
     */
    abstract send(ctx: TContext): Observable<any>;

    /**
     * receive
     */
    abstract receive(options: ServerOpts): Observable<TContext>;

    /**
     * write encode response message.
     * @param packet 
     * @param chunk 
     */
    abstract writeMessage(chunk: Buffer, ctx: TContext): Promise<void>;
    /**
     * write packet buffers.
     * @param packet 
     * @param chunk 
     * @param callback 
     */
    abstract write(packet: ResponsePacket, chunk: Buffer, callback?: (error?: any) => void): void;

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



