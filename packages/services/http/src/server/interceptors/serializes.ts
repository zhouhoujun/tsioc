import { Injectable } from '@tsdi/ioc';
import { Handler, Interceptor, PipeTransform } from '@tsdi/core';
import { HEAD } from '@tsdi/common';
import { Packet, PacketLengthException, TransportContext } from '@tsdi/common/transport';
import { Observable, of, throwError } from 'rxjs';
import { CONTENT_LENGTH, CONTENT_TYPE, HttpContext, TRANSFER_ENCODING } from '../context';




@Injectable()
export class EmptyStatusSerializeInterceptor implements Interceptor<HttpContext, Packet> {

    intercept(input: HttpContext, next: Handler, context: TransportContext): Observable<Packet> {
        if (input.statusAdapter?.isEmpty(input.status)) {
            const payload = input.body = null;
            return of({
                payload
            })
        }
        return next.handle(input, context)
    }
}

@Injectable()
export class HeadMethodSerializeInterceptor implements Interceptor<HttpContext, Packet> {
    intercept(input: HttpContext, next: Handler, context: TransportContext): Observable<Packet> {
        if (input.method == HEAD) {
            if (!input.headersSent && !input.response.hasHeader(CONTENT_LENGTH)) {
                const length = input.length;
                if (Number.isInteger(length)) input.length = length
            }
            return of({
                payload: null
            })
        }
        return next.handle(input, context)
    }
}

@Injectable()
export class NoBodySerializeInterceptor implements Interceptor<HttpContext, Packet> {
    intercept(input: HttpContext, next: Handler, context: TransportContext): Observable<Packet> {
        if (input.body === null) {
            if (input.explicitNullBody) {
                input.response.removeHeader(CONTENT_TYPE);
                input.response.removeHeader(CONTENT_LENGTH);
                input.response.removeHeader(TRANSFER_ENCODING);
                return of({
                    payload: null
                })
            }

            const payload = Buffer.from(input.statusMessage ?? String(input.status));
            if (!input.headersSent) {
                input.type = 'text';
                input.length = Buffer.byteLength(payload)
            }
            return of({
                payload
            })

        }
        return next.handle(input, context)
    }
}

@Injectable()
export class LengthLimitSerializeInterceptor implements Interceptor<HttpContext, Packet> {
    intercept(input: HttpContext, next: Handler, context: TransportContext): Observable<Packet> {
        const len = input.length ?? 0;
        const opts = input.serverOptions.transportOptions;
        if (opts?.maxSize && len > opts.maxSize) {
            const btpipe = input.get<PipeTransform>('bytes-format');
            return throwError(()=> new PacketLengthException(`Packet length ${btpipe.transform(len)} great than max size ${btpipe.transform(opts.maxSize)}`));
        }
        return next.handle(input, context)
    }
}