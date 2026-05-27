import { Injectable } from '@tsdi/ioc';
import { RequestContext, RequestHandler, RequestInterceptor } from '@tsdi/common';
import { Observable } from 'rxjs';

@Injectable()
export class CoapJsonInterceptor implements RequestInterceptor<any> {
    intercept(input: any, next: RequestHandler<any, any, RequestContext>, context: RequestContext): Observable<any> {
        return next.handle(input, context);
    }
}
