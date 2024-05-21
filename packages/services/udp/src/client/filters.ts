import { Injectable } from '@tsdi/ioc';
import { Filter, Handler, Interceptor } from '@tsdi/core';
import { CodingsContext, isBuffer, toBuffer } from '@tsdi/common/transport';
import { Observable, mergeMap } from 'rxjs';
import { udptl } from '../consts';
import { UdpClientTransportOpts } from './options';


@Injectable()
export class UdpClientMessageDecodeFilter implements Filter {
    intercept(input: any, next: Handler, context: CodingsContext): Observable<any> {
        return next.handle(input?.msg, context)
    }
}



@Injectable()
export class UdpClientMessageEncodeFilter implements Filter {
    intercept(input: any, next: Handler, context: CodingsContext): Observable<any> {
        if (!context.channel) {
            if (udptl.test(input.url)) {
                const url = new URL(input.url!);
                context.channel = url.host;
            } else {
                context.channel = (context.options as UdpClientTransportOpts).host
            }
        }
        return next.handle(input, context)
            .pipe(
                mergeMap(async result => {
                    if (isBuffer(result)) return result;
                    return await toBuffer(result, context.options.maxSize);
                })
            )
    }
}
