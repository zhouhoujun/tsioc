import { Injectable, getClass, getClassName } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { CodingsContext, CodingMappings, NotSupportedExecption, Packet, EncodeHandler } from '@tsdi/common/transport';
import { Observable, mergeMap, of, throwError } from 'rxjs';
import { RequestContext } from '../RequestContext';
import { RequestContextImpl } from '../impl/request.context';


@Injectable({ static: true })
export class OutgoingEncodingsHandlers {

    @EncodeHandler(RequestContext)
    handleContext(input: RequestContext) {
        const response = input.response;
        const packet = {
            id: response.id,
            type: response.type,
            status: response.statusCode,
            statusMessage: response.statusMessage,
            headers: response.headers
        } as Packet;
        if (response.error) {
            packet.error = response.error;
        }
        if (response.tHeaders.hasContentLength()) {
            packet.payload = input.body;
        }
        return packet;
    }

}


@Injectable()
export class OutgoingEncodeInterceper implements Interceptor<any, any, CodingsContext> {

    constructor(private mappings: CodingMappings) {
    }

    intercept(input: RequestContext, next: Handler<any, any, CodingsContext>, context: CodingsContext): Observable<any> {

        let type = getClass(input);
        if (type == RequestContextImpl) {
            type = RequestContext;
        }
        const handlers = this.mappings.getEncodings(context.options).getHanlder(type) ?? this.mappings.getEncodings().getHanlder(type);

        if (handlers && handlers.length) {
            return handlers.reduceRight((obs$, curr) => {
                return obs$.pipe(
                    mergeMap(input => curr.handle(input, context.next(input))),
                    mergeMap(res => next.handle(res, context))
                );
            }, of(input))
        } else {
            return throwError(() => new NotSupportedExecption(`No encodings handler for ${context.options.transport}${context.options.microservice ? ' microservice' : ''} outgoing type: ${getClassName(type)}`))
        }
    }
}
