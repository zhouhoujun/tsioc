import { Abstract, Injector } from '@tsdi/ioc';
import { ResponseEventFactory, TransportEvent, TransportOpts, TransportRequest, TransportSession } from '@tsdi/common';
import { Observable } from 'rxjs';
import { RequestEncoder, ResponseDecoder } from './codings';



/**
 * transport session.
 */
@Abstract()
export abstract class ClientTransportSession<TSocket = any, TMsg = any, TRequest extends TransportRequest = TransportRequest> extends TransportSession<TSocket, TRequest>  {
    
    /**
     * request encoder.
     */
    abstract get encoder(): RequestEncoder<TMsg, TRequest>;
    /**
     * response decoder.
     */
    abstract get decoder(): ResponseDecoder<TransportEvent, TMsg>;
    
    /**
     * response event factory.
     */
    abstract get eventFactory(): ResponseEventFactory;
    /**
     * send request message.
     * @param packet 
     */
    abstract send(req: TRequest): Observable<any>;
    /**
     * request.
     * @param packet 
     */
    abstract request(req: TRequest): Observable<TransportEvent>;

}


/**
 * client transport session factory.
 */
@Abstract()
export abstract class ClientTransportSessionFactory<TSocket = any> {
    /**
     * injector.
     */
    abstract get injector(): Injector;
    /**
     * create transport session.
     * @param options 
     */
    abstract create(socket: TSocket, options: TransportOpts): ClientTransportSession<TSocket>;
}
