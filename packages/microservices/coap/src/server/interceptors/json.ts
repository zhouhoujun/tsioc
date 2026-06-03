import { Injectable } from '@tsdi/ioc';
import { ContentType, RequestContext, RequestHandler, RequestInterceptor, StreamAdapter } from '@tsdi/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class CoapJsonInterceptor implements RequestInterceptor<any> {
    intercept(input: any, next: RequestHandler<any, any, RequestContext>, context: RequestContext): Observable<any> {
        return next.handle(input, context).pipe(
            map(response => this.serialize(response, context))
        );
    }

    private serialize(response: any, context: RequestContext) {
        const streamAdapter = context.get(StreamAdapter);
        if (!streamAdapter.isStream(response)) {
            return response;
        }
        if (context.getContentType() === ContentType.APPL_JSON) {
            throw Object.assign(new Error('Packet length exceeded'), { status: '4.00', statusCode: 400 });
        }
        return response;
    }
}
