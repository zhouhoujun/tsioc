import { Injectable, getClass } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { CodingsContext, Packet, EncodeHandler, Codings } from '@tsdi/common/transport';
import { Observable, mergeMap } from 'rxjs';
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

    constructor(private codings: Codings) { }

    intercept(input: RequestContext, next: Handler<any, any, CodingsContext>, context: CodingsContext): Observable<any> {
        let type = getClass(input);
        if (type == RequestContextImpl) {
            type = RequestContext;
        }

        return this.codings.encodeType(type, input, context)
            .pipe(mergeMap(res => next.handle(res, context)));

    }
}
