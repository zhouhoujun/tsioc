import { Abstract } from '@tsdi/ioc';
import { Incoming, Outgoing, RequestHandler } from '@tsdi/common';
import { AbstractRequestContext } from '@tsdi/endpoints';
import { Observable } from 'rxjs';


@Abstract()
export abstract class TcpHandler<TReq, TRes> implements RequestHandler<TReq, TRes, AbstractRequestContext> {

    abstract handle(input: TReq, context: AbstractRequestContext<Incoming<any, any>, Outgoing<any, any>, any>): Observable<TRes>;

}

