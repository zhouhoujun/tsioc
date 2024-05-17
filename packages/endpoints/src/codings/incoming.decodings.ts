import { Injectable, getClass } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import {
    CodingsContext, NotSupportedExecption, PacketData, PacketIncoming,
    PacketOutgoing, DecodeHandler, Codings
} from '@tsdi/common/transport';
import { Observable, mergeMap, of, throwError } from 'rxjs';
import { RequestContext, RequestContextFactory } from '../RequestContext';
import { TransportSession } from '../transport.session';



@Injectable({ static: true })
export class IncomingDecodingsHandlers {

    @DecodeHandler(PacketIncoming)
    handleResponseIncoming(incoming: PacketIncoming, context: CodingsContext) {

        const session = context.session as TransportSession;
        const injector = session.injector;

        const outgoing = new PacketOutgoing({
            id: incoming.id,
            headers: incoming.headers,
            pattern: incoming.pattern
        }, context.options);

        return injector.get(RequestContextFactory).create(
            session,
            incoming,
            outgoing,
            session.serverOptions);
    }

}



@Injectable()
export class IncomingDecodeInterceper implements Interceptor<any, any, CodingsContext> {

    constructor(private codings: Codings) { }

    intercept(input: any, next: Handler<any, any, CodingsContext>, context: CodingsContext): Observable<any> {
        return next.handle(input, context).pipe(
            mergeMap(res => {
                if(res instanceof RequestContext) return of(res);
                if (getClass(res) === Object) {
                    const packet = res as PacketData;
                    if (!(packet.url || packet.topic || packet.headers || packet.payload)) {
                        return throwError(() => new NotSupportedExecption(`${context.options.transport}${context.options.microservice ? ' microservice' : ''} incoming is not packet data!`));
                    }
                    res = new PacketIncoming(packet, context.options);
                }
                return this.codings.decode(res, context);
            })
        );
    }
}



