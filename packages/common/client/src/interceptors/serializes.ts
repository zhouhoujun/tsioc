import { hasProps, isNil, isString, isUndefined } from '@tsdi/ioc';
import { BackendFn, HandlerFn, InterceptorFn } from '@tsdi/core';
import { AbstractRequest, PatternFormatter, PatternRequest, TopicRequest, UrlRequest } from '@tsdi/common';
import { ClientOutgoing, TopicClientOutgoing, TransportContext, UrlClientOutgoing } from '@tsdi/common/transport';
import { map, of } from 'rxjs';
import { ClientTransport } from '../transport';


export const requestPacketIfySerializeInterceptor: InterceptorFn<AbstractRequest<any>> = (input: AbstractRequest<any>, next: HandlerFn<AbstractRequest<any>>, context: TransportContext) => {
    return next(input, context)
        .pipe(
            map(pkg => {
                let payload: any;
                if (isUndefined(pkg.payload)) {
                    const id = input.id;
                    payload = pkg;
                    pkg = { id };
                } else {
                    payload = pkg.payload;
                }
                if (isString(payload)) {
                    pkg.payload = payload = Buffer.from(payload);
                }
                if (payload && isNil(pkg.contentLength)) {
                    pkg.contentLength = Buffer.byteLength(payload)
                }
                return pkg;
            })
        )
}


export const requestSerializeBackend: BackendFn<AbstractRequest<any>> = (input: AbstractRequest<any>, context: TransportContext) => {

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
        (pkg as ClientOutgoing).pattern = input.context.get(PatternFormatter)?.format((input as PatternRequest).pattern);
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
    return of(JSON.stringify(pkg, null, 2));
}


export const requestBodySerializeBackend: BackendFn<AbstractRequest<any>> = (input: AbstractRequest<any>, context: TransportContext) => {
    if (context.transport.streamAdapter.isJson(input.body)) {
        return of(JSON.stringify(input.body, null, 2));
    }
    return of(input.body);
}
