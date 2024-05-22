import { Injectable, getClass } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { Codings, EncodeHandler } from '@tsdi/common/codings';
import { TransportContext, PacketData } from '@tsdi/common/transport';
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
        } as PacketData;
        if (response.error) {
            packet.error = response.error;
        }
        if (input.length) {
            packet.payload = input.body;
            packet.payloadLength = input.length
        }
        return packet;
    }

}


@Injectable()
export class OutgoingEncodeInterceper implements Interceptor<any, any, TransportContext> {

    constructor(private codings: Codings) { }

    intercept(input: RequestContext, next: Handler<any, any, TransportContext>, context: TransportContext): Observable<any> {
        let type = getClass(input);
        if (type == RequestContextImpl) {
            type = RequestContext;
        }

        return this.codings.encodeType(type, input, context)
            .pipe(mergeMap(res => next.handle(res, context)));

    }
}
