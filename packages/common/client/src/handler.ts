import { Abstract, Context } from '@tsdi/ioc';
import { RequestHandler } from '@tsdi/core';
import { ResponseEvent, AbstractRequest } from '@tsdi/common';
import { Observable } from 'rxjs';


/**
 * Client Handler
 */
@Abstract()
export abstract class ClientHandler<TRequest extends AbstractRequest<any> = AbstractRequest<any>, TResponse extends ResponseEvent<any> = ResponseEvent<any>> implements RequestHandler<TRequest, TResponse, Context> {
    
    abstract handle(input: TRequest, context: Context): Observable<TResponse>;

}
