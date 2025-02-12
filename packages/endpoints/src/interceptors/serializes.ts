import { hasProps, Injectable } from '@tsdi/ioc';
import { Handler, Interceptor, PipeTransform } from '@tsdi/core';
import { AbstractTransport, Outgoing, Packet, PacketLengthException } from '@tsdi/common/transport';
import { map, Observable, of, throwError } from 'rxjs';
import { RequestContext } from '../RequestContext';


@Injectable()
export class RequestContextServializeInterceptor implements Interceptor<RequestContext, Packet> {

    intercept(input: RequestContext, next: Handler<any>, context?: any): Observable<Packet> {

        const id = input.response.id ?? input.request.id;
        const headers = input.headerAdapter.getHeaders(input.response.headers);
        const pkg = {
            id
        } as Outgoing;
        if (input.status) {
            pkg.statusCode = input.status;
        }
        if (input.statusMessage) {
            pkg.statusMessage = input.statusMessage;
        }
        if (input.response.error) {
            pkg.error = input.response.error;
        }
        if (hasProps(headers)) {
            pkg.headers = headers;
        }

        if (input.streamAdapter.isReadable(input.body)) {
            let contentLength = input.length || 0;
            if (id) {
                const idLen = input.transport.options.idLen ?? 2;
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
                    payload: Buffer.from(JSON.stringify(pkg)),
                },
                {
                    id,
                    headers,
                    payload: input.body,
                    contentLength
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

@Injectable()
export class RequestContextVaildateInterceptor implements Interceptor<RequestContext, Packet> {

    intercept(input: RequestContext, next: Handler<any>, context?: any): Observable<Packet> {
        const { injector, options } = context.transport as AbstractTransport;
        const length = input.length;
        const sizeLimit = options.maxSize ?? options.limit;
        if (length && sizeLimit && length > sizeLimit) {
            const btpipe = injector.get<PipeTransform>('bytes-format');
            return throwError(() => new PacketLengthException(`Packet length ${btpipe.transform(length)} great than max size ${btpipe.transform(sizeLimit)}`));
        }
        return next.handle(input, context);
    }
}