import { Abstract } from '@tsdi/ioc';
import { RequestContext, RequestHandler, ResponseEvent } from '@tsdi/common';
import { TcpRequest } from './request';
import { Observable } from 'rxjs';


@Abstract()
export abstract class TcpRequestHandler implements RequestHandler<TcpRequest<any>, ResponseEvent<any>, RequestContext> {
    abstract handle(input: TcpRequest<any>, context: RequestContext): Observable<ResponseEvent<any>>;
}
