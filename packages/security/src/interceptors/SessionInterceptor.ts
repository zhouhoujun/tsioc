import { Injectable } from '@tsdi/ioc';
import { ApplicationHandler, ApplicationInterceptor } from '@tsdi/core';
import { OutgoingMessage } from '@tsdi/common/transport';
import { RequestContext } from '@tsdi/endpoints';
import { Observable } from 'rxjs';


@Injectable()
export class SessionInterceptor implements ApplicationInterceptor<RequestContext, OutgoingMessage> {

    intercept(input: RequestContext, next: ApplicationHandler, context?: any): Observable<any> {
        return next.handle(input, context)
    }

}
