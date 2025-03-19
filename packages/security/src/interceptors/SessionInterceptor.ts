import { Incoming, Outgoing, OutgoingMessage } from '@tsdi/common/transport';
import { Handler, Interceptor } from '@tsdi/core';
import { RequestContext, ServiceConfig } from '@tsdi/endpoints';
import { Observable } from 'rxjs';



export class SessionInterceptor implements Interceptor<RequestContext, OutgoingMessage> {

    intercept(input: RequestContext, next: Handler, context?: any): Observable<any> {
        next.handle(input, context)
    }
    
}