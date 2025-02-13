import { hasProps } from '@tsdi/ioc';
import { HandlerFn, InterceptorFn } from '@tsdi/core';
import { AbstractRequest, PatternRequest, TopicRequest, UrlRequest } from '@tsdi/common';
import { ClientOutgoing, Packet, TopicClientOutgoing, TransportContext, UrlClientOutgoing } from '@tsdi/common/transport';
import { map, of } from 'rxjs';
import { ClientTransport } from '../transport';



export const requestServializeInterceptor: InterceptorFn<AbstractRequest<any>, Packet> = (input: AbstractRequest<any>, next: HandlerFn, context: TransportContext) => {

    const id = input.id;
    const headers = input.headers.getHeaders();
    const pkg = {
        id
    } as ClientOutgoing;

    if (hasProps(headers)) {
        pkg.headers = headers;
    }

    const transport = context.transport as ClientTransport;

    if ((input as UrlRequest).url) {
        (pkg as UrlClientOutgoing).url = (input as UrlRequest).getUrlWithParams();
        if ((input as UrlRequest).method) {
            (pkg as UrlClientOutgoing).method = (input as UrlRequest).method;
        }
    } else if ((input as TopicRequest).topic) {
        (pkg as TopicClientOutgoing).topic = (input as TopicRequest).topic;
        // (pkg as TopicClientOutgoing).responseTopic = (input as TopicRequest).responseTopic;
        (pkg as TopicClientOutgoing).params = (input as TopicRequest).params.toRecord();
    } else {
        (pkg as ClientOutgoing).pattern = transport.patternFormatter?.format((input as PatternRequest).pattern);
        (pkg as ClientOutgoing).params = (input as PatternRequest).params.toRecord();
    }

    if (transport.streamAdapter.isReadable(input.body)) {

        let contentLength = transport.headerAdapter?.getContentLength(headers) ?? 0;

        if (id) {
            const idLen = transport.options.idLen ?? 2;
            const idBuff = Buffer.alloc(idLen);
            if (idLen > 4) {
                idBuff.write(id.toString());
            } else {
                idBuff.writeUIntBE(id as number, 0, idLen);
            }
            input.body.unshift(idBuff);
            contentLength += idLen;
        }
        return of(
            {
                id,
                headers,
                payload: Buffer.from(JSON.stringify(pkg))
            },
            {
                id,
                headers,
                payload: input.body,
                contentLength
            }
        )
    }

    pkg.body = input.body;
    return next(pkg, context)
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
