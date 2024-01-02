import { Abstract, Injector } from '@tsdi/ioc';
import { FileAdapter, TransportOpts, TransportSession } from '@tsdi/common';
import { Logger } from '@tsdi/logger';
import { Observable, finalize, mergeMap } from 'rxjs';
import { IncomingDecoder, OutgoingEncoder } from './codings';
import { TransportContext } from '../TransportContext';
import { ServerOpts } from '../Server';
import { TransportEndpoint } from '../TransportEndpoint';


/**
 * transport session.
 */
@Abstract()
export abstract class ServerTransportSession<TSocket = any, TMsg = any, TContext extends TransportContext = TransportContext> extends TransportSession<TSocket, TContext> {

    abstract get encoder(): OutgoingEncoder<TMsg>;
    abstract get decoder(): IncomingDecoder<TMsg>;

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
     * handle revice request message.
     */
    handleRequest(endpoint: TransportEndpoint, options: ServerOpts, logger?: Logger) {
        return this.receive(options).pipe(
            mergeMap(context => {

                logger && context.setValue(Logger, logger);

                return endpoint.handle(context)
                    .pipe(
                        finalize(() => {
                            context.destroy();
                        }))
            })
        ).subscribe({
            error(err) {
                logger?.error(err);
            },
        });
    }

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



