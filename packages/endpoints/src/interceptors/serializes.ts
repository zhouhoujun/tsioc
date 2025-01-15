import { Injectable } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { Packet } from '@tsdi/common/transport';
import { map, Observable, of } from 'rxjs';
import { RequestContext } from '../RequestContext';


@Injectable()
export class RequestContextServializeInterceptor implements Interceptor<RequestContext, Packet> {

    intercept(input: RequestContext, next: Handler<any>, context?: any): Observable<Packet> {

        const id = input.response.id ?? input.request.id;
        const headers = input.headerAdapter.getHeaders(input.response.headers);

        if (input.streamAdapter.isReadable(input.body)) {
            return of({
                id,
                headers,
                packet: input.body
            })
        }

        const data = { headers, payload: input.body, status: input.status, statusMessage: input.statusMessage };

        return next.handle(data, context)
            .pipe(
                map(packet => {
                    if (typeof packet === 'string') {
                        packet = Buffer.from(packet);
                    }
                    return {
                        id,
                        headers,
                        packet
                    };
                }));
    }
}

