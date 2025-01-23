import { hasProps, Injectable } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { AbstractRequest, PatternRequest, TopicRequest, UrlRequest } from '@tsdi/common';
import { ClientOutgoing, Packet, TopicClientOutgoing, TransportContext, UrlClientOutgoing } from '@tsdi/common/transport';
import { map, Observable, of } from 'rxjs';

@Injectable()
export class RequestServializeInterceptor implements Interceptor<AbstractRequest<any>, Packet> {

    intercept(input: AbstractRequest<any>, next: Handler, context: TransportContext): Observable<Packet> {

        const id = input.id;
        const headers = input.headers.getHeaders();
        let pkg = {
            id
        } as ClientOutgoing;

        if (hasProps(headers)) {
            pkg.headers = headers;
        }

        if ((input as UrlRequest).url) {
            (pkg as UrlClientOutgoing).url = (input as UrlRequest).getUrlWithParams();
            (pkg as UrlClientOutgoing).method = (input as UrlRequest).method;
        } else if ((input as TopicRequest).topic) {
            (pkg as TopicClientOutgoing).topic = (input as TopicRequest).topic;
            (pkg as TopicClientOutgoing).params = (input as TopicRequest).params.toRecord();
        } else {
            (pkg as ClientOutgoing).pattern = context.transport.patternFormatter?.format((input as PatternRequest).pattern);
            (pkg as ClientOutgoing).params = (input as PatternRequest).params.toRecord();
        }

        if (context.transport.streamAdapter.isReadable(input.body)) {
            return of({
                id,
                headers,
                header: hasProps(pkg) ? Buffer.from(JSON.stringify(pkg)) : null,
                payload: input.body
            })
        }

        pkg.body = input.body;
        return next.handle(pkg, context)
            .pipe(
                map(payload => {
                    if (typeof payload === 'string') {
                        payload = Buffer.from(payload);
                    }
                    return {
                        id,
                        headers,
                        payload,
                        contentLength: payload.length
                    };
                }));
    }
}

