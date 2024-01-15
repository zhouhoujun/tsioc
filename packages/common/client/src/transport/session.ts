import { Abstract, Injector } from '@tsdi/ioc';
import { ResponseEventFactory, TransportEvent, TransportOpts, TransportRequest, TransportSession } from '@tsdi/common';
import { Observable } from 'rxjs';
import { RequestEncoder, ResponseDecoder } from './codings';



/**
 * transport session.
 */
@Abstract()
export abstract class ClientTransportSession<TSocket = any, TMsg = any> extends TransportSession<TSocket, TransportRequest<any, TMsg>>  {
    
    /**
     * request encoder.
     */
    abstract get encoder(): RequestEncoder<TMsg, TransportRequest<any, TMsg>>;
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
    abstract send(req: TransportRequest): Observable<any>;
    /**
     * request.
     * @param packet 
     */
    abstract request(req: TransportRequest): Observable<TransportEvent>;

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
