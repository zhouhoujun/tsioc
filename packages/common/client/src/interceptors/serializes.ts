import { hasProps, isNil, isString, isUndefined } from '@tsdi/ioc';
import { RequestHandler, RequestHandlerFn, RequestInterceptorFn } from '@tsdi/core';
import { AbstractRequest, PatternFormatter, PatternRequest, TopicRequest, UrlRequest } from '@tsdi/common';
import { ClientOutgoing, isBuffer, TEXT_DECODER, TopicClientOutgoing, TransportContext, UrlClientOutgoing } from '@tsdi/common/transport';
import { map, of } from 'rxjs';
import { ClientTransport } from '../transport';


export const requestPacketIfySerializeInterceptor: RequestInterceptorFn<AbstractRequest<any>> = (input: AbstractRequest<any>, next: RequestHandlerFn<AbstractRequest<any>>, context: TransportContext) => {
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

export const readabeRequestBodyerializeInterceptor: RequestInterceptorFn<AbstractRequest<any>> = (input: AbstractRequest<any>, next: RequestHandlerFn<AbstractRequest<any>>, context: TransportContext) => {
    const transport = context.transport as ClientTransport;
    if (transport.streamAdapter.isReadable(input.body)) {
        const pkg = parseToOutgoing(input, context);
        let contentLength = transport.headerAdapter.getContentLength(input) ?? 0;
        if (pkg.id) {
            const idLen = transport.options.idLen ?? 2;
            const idBuff = Buffer.alloc(idLen);
            if (idLen > 4) {
                idBuff.write(pkg.id.toString());
            } else {
                idBuff.writeUIntBE(pkg.id as number, 0, idLen);
            }
            input.body.unshift(idBuff);
            contentLength += idLen;
        }
        return of(
            {
                id: pkg.id,
                headers: pkg.headers,
                payload: Buffer.from(JSON.stringify(pkg))
            },
            {
                id: pkg.id,
                headers: pkg.headers,
                payload: input.body,
                contentLength
            }
        )
    }
    return next(input, context)
}



export const requestSerializeBackend: RequestHandlerFn<AbstractRequest<any>> = (input: AbstractRequest<any>, context: TransportContext) => {
    const pkg = parseToOutgoing(input, context);
    let body = input.body;
    if (isBuffer(body)) {
        body = context.get(TEXT_DECODER).decode(body);
    }
    pkg.body = body;
    return of(JSON.stringify(pkg, null, 2));
}

function parseToOutgoing(input: AbstractRequest<any>, context: TransportContext): ClientOutgoing {
    const id = input.id;
    const headers = input.headers.getHeaders();
    const pkg = {
        id
    } as ClientOutgoing;

    if (hasProps(headers)) {
        pkg.headers = headers;
    }

    if ((input as UrlRequest).url) {
        if (isString((input as UrlRequest).pattern)) pkg.pattern = (input as UrlRequest).pattern as string;
        (pkg as UrlClientOutgoing).url = (input as UrlRequest).getUrlWithParams();
        if ((input as UrlRequest).method) {
            (pkg as UrlClientOutgoing).method = (input as UrlRequest).method;
        }
    } else if ((input as TopicRequest).topic) {
        if (isString((input as TopicRequest).pattern)) pkg.pattern = (input as TopicRequest).pattern as string;
        (pkg as TopicClientOutgoing).topic = (input as TopicRequest).topic;
        // (pkg as TopicClientOutgoing).responseTopic = (input as TopicRequest).responseTopic;
        (pkg as TopicClientOutgoing).params = (input as TopicRequest).params.toRecord();
    } else {
        (pkg as ClientOutgoing).pattern = input.context.get(PatternFormatter)?.format((input as PatternRequest).pattern);
        (pkg as ClientOutgoing).params = (input as PatternRequest).params.toRecord();
    }

    return pkg;
}

export const requestBodySerializeBackend: RequestHandlerFn<AbstractRequest<any>> = (input: AbstractRequest<any>, context: TransportContext) => {
    if (context.transport.streamAdapter.isJson(input.body)) {
        return of(JSON.stringify(input.body, null, 2));
    }
    return of(input.body);
}
