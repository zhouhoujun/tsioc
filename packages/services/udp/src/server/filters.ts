import { Injectable } from '@tsdi/ioc';
import { Filter, Handler } from '@tsdi/core';
import { TransportContext, isBuffer, toBuffer } from '@tsdi/common/transport';
import { Observable, map, mergeMap } from 'rxjs';


@Injectable()
export class UdpMessageDecodeFilter implements Filter {
    intercept(input: any, next: Handler, context: TransportContext): Observable<any> {
        if (!context.channel) {
            const rinfo = input.rinfo;
            context.channel = rinfo.family == 'IPv6' ? `[${rinfo.address}]:${rinfo.port}` : `${rinfo.address}:${rinfo.port}`
        }
        return next.handle(input.msg, context)
            .pipe(
                map(ctx => {
                    ctx.channel = context.channel;
                    ctx.incoming = context.incoming;
                    return ctx;
                })
            )
    }
}


@Injectable()
export class UdpMessageEncodeFilter implements Filter {
    intercept(input: any, next: Handler, context: TransportContext): Observable<any> {
        return next.handle(input, context)
            .pipe(
                mergeMap(async data => {
                    if (isBuffer(data)) return data;
                    return await toBuffer(data, context.options.maxSize);
                })
            )
    }
}
