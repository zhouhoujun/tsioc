import { Abstract, Injector } from '@tsdi/ioc';
import { FileAdapter, TransportOpts, TransportSession } from '@tsdi/common';
import { Observable } from 'rxjs';
import { IncomingPacketDecoder, OutgoingPacketEncoder } from './codings';
import { TransportContext } from '../TransportContext';
import { ServerOpts } from '../Server';


/**
 * transport session.
 */
@Abstract()
export abstract class ServerTransportSession<TSocket = any, TMsg = any, TContext extends TransportContext = TransportContext> extends TransportSession<TSocket, TContext> {

    abstract get packetEncoder(): OutgoingPacketEncoder<TMsg>;
    abstract get packetDecoder(): IncomingPacketDecoder<TMsg>;

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
    abstract writeMessage(chunk: TMsg, ctx: TContext): Promise<void>;

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



