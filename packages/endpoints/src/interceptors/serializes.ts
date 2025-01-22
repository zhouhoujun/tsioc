import { Injectable } from '@tsdi/ioc';
import { Handler, Interceptor, PipeTransform } from '@tsdi/core';
import { AbstractTransport, Packet, PacketLengthException } from '@tsdi/common/transport';
import { map, Observable, of, throwError } from 'rxjs';
import { RequestContext } from '../RequestContext';


@Injectable()
export class RequestContextServializeInterceptor implements Interceptor<RequestContext, Packet> {

    intercept(input: RequestContext, next: Handler<any>, context?: any): Observable<Packet> {

        const id = input.response.id ?? input.request.id;
        const headers = input.headerAdapter.getHeaders(input.response.headers);

        if (input.streamAdapter.isReadable(input.body)) {
            const contentLength = input.length;
            return of({
                id,
                headers,
                error: input.response.error,
                payload: input.body,
                contentLength
            })
        }

        const data = { error: input.response.error, headers, body: input.body, status: input.status, statusMessage: input.statusMessage };

        return next.handle(data, context)
            .pipe(
                map(payload => {
                    if (typeof payload === 'string') {
                        payload = Buffer.from(payload);
                    }
                    return {
                        id,
                        headers,
                        error: input.response.error,
                        payload,
                        contentLength: payload.length
                    };
                }));
    }
}

@Injectable()
export class RequestContextVaildateInterceptor implements Interceptor<RequestContext, Packet> {

    intercept(input: RequestContext, next: Handler<any>, context?: any): Observable<Packet> {
        const { injector, options } = context.transport as AbstractTransport;
        const length = input.length;
        if (length && options.maxSize && length > options.maxSize) {
            const btpipe = injector.get<PipeTransform>('bytes-format');
            return throwError(() => new PacketLengthException(`Packet length ${btpipe.transform(length)} great than max size ${btpipe.transform(options.maxSize)}`));
        }
        return next.handle(input, context);
    }
}