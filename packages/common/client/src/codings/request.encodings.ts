import { Injectable, getClass, getClassName } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { PatternFormatter, TransportRequest } from '@tsdi/common';
import { CodingMappings, CodingsContext, NotSupportedExecption, PacketData, EncodeHandler } from '@tsdi/common/transport';
import { Observable, mergeMap, of, throwError } from 'rxjs';



@Injectable({ static: true })
export class RequestEncodingsHandlers {

    @EncodeHandler(TransportRequest)
    handleRequest(req: TransportRequest) {
        const packet = {
            url: req.urlWithParams,
            headers: req.headers,
            payload: req.payload,
            payloadLength: req.headers.getContentLength()
        } as PacketData;
        if (!packet.url && req.pattern) {
            packet.url = req.context.get(PatternFormatter).format(req.pattern);
        }
        if (req.method) {
            packet.method = req.method;
        }
        return packet
    }
}


@Injectable()
export class RequestEncodeInterceper implements Interceptor<any, any, CodingsContext> {

    constructor(private mappings: CodingMappings) {
    }

    intercept(input: TransportRequest<any>, next: Handler<any, any, CodingsContext>, context: CodingsContext): Observable<any> {

        const type = getClass(input);
        const handlers = this.mappings.getEncodings(context.options).getHanlder(type) ?? this.mappings.getEncodings().getHanlder(type);

        if (handlers && handlers.length) {
            return handlers.reduceRight((obs$, curr) => {
                return obs$.pipe(
                    mergeMap(input => curr.handle(input, context.next(input))),
                    mergeMap(res => next.handle(res, context))
                );
            }, of(input))
        } else {
            return throwError(() => new NotSupportedExecption(`No encodings handler for ${context.options.transport}${context.options.microservice ? ' microservice' : ''} request type: ${getClassName(type)}`))
        }
    }
}


