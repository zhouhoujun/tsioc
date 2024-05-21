import { Injectable } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { CodingsContext, isBuffer, toBuffer } from '@tsdi/common/transport';
import { Observable, map, mergeMap } from 'rxjs';


@Injectable()
export class UdpMessageDecodeInterceptor implements Interceptor {
    intercept(input: any, next: Handler, context: CodingsContext): Observable<any> {
        if (!context.channel) {
            const rinfo = input.rinfo;
            context.channel = rinfo.family == 'IPv6' ? `[${rinfo.address}]:${rinfo.port}` : `${rinfo.address}:${rinfo.port}`
        }
        return next.handle(input.msg, context)
            .pipe(
                map(ctx => {
                    ctx.channel = context.channel;
                    return ctx;
                })
            )
    }
}


@Injectable()
export class UdpMessageEncodeInterceptor implements Interceptor {
    intercept(input: any, next: Handler, context: CodingsContext): Observable<any> {
        return next.handle(input, context)
            .pipe(
                mergeMap(async data => {
                    if (isBuffer(data)) return data;
                    return await toBuffer(data, context.options.maxSize);
                })
            )
    }
}
