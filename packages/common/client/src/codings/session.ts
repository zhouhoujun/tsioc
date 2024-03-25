import { Abstract } from '@tsdi/ioc';
import { InputContext, TransportEvent, TransportRequest } from '@tsdi/common';
import { TransportOpts, TransportSession } from '@tsdi/common/transport';
import { Observable, filter, finalize, mergeMap } from 'rxjs';

@Abstract()
export abstract class ClientTransportSession<TSocket = any, TMsg = any, > extends TransportSession<TransportRequest, TransportEvent, TMsg, TSocket> {

    request(req: TransportRequest): Observable<TransportEvent> {
        const context = new InputContext();
        return this.send(req, context)
            .pipe(
                mergeMap(msg => this.receive(context.next(msg)).pipe(filter(res => this.filter(req, msg, res)))),
                finalize(() => context.onDestroy())
            )
    }

    /**
     * filter response of the request.
     * @param req 
     * @param res 
     */
    abstract filter(req: TransportRequest, msg: TMsg, res: TransportEvent): boolean;

}

/**
 * transport session factory.
 */
@Abstract()
export abstract class ClientTransportSessionFactory<TSocket = any, TMsg = any> {
    /**
     * create transport session.
     * @param options 
     */
    abstract create(socket: TSocket, options: TransportOpts): ClientTransportSession<TSocket, TMsg>;
}
