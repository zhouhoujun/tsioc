import { Injectable } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { AbstractRequest, PatternRequest, TopicRequest, UrlRequest } from '@tsdi/common';
import { Packet, TransportContext } from '@tsdi/common/transport';
import { map, Observable, of } from 'rxjs';

@Injectable()
export class RequestServializeInterceptor implements Interceptor<AbstractRequest<any>, Packet> {

    intercept(input: AbstractRequest<any>, next: Handler, context: TransportContext): Observable<Packet> {

        const id = input.id;
        const headers = input.headers.getHeaders();
        
        if (context.transport.streamAdapter.isReadable(input.body)) {
            return of({
                id,
                headers,
                packet: input.body
            })
        }

        let data: any;

        if ((input as UrlRequest).url) {
            data = { headers, payload: input.body, method: (input as UrlRequest).method, url: (input as UrlRequest).getUrlWithParams() };
        } else if ((input as TopicRequest).topic) {
            data = { headers, payload: input.body, topic: (input as TopicRequest).topic, params: input.params.toRecord() };
        } else {
            data = { headers, payload: input.body, pattern: (input as PatternRequest).pattern, params: input.params.toRecord() };
        }

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

