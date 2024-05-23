import { Injectable, getClass } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { DecodeHandler, Codings } from '@tsdi/common/codings';
import { NotSupportedExecption, PacketData, PacketIncoming, PacketOutgoing, TransportContext } from '@tsdi/common/transport';
import { Observable, mergeMap, of, throwError } from 'rxjs';
import { RequestContext, RequestContextFactory } from '../RequestContext';
import { TransportSession } from '../transport.session';



@Injectable({ static: true })
export class IncomingDecodingsHandlers {

    @DecodeHandler(PacketIncoming)
    handleResponseIncoming(incoming: PacketIncoming, context: TransportContext) {

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
export class IncomingDecodeInterceper implements Interceptor<any, any, TransportContext> {

    constructor(private codings: Codings) { }

    intercept(input: any, next: Handler<any, any, TransportContext>, context: TransportContext): Observable<any> {
        return next.handle(input, context).pipe(
            mergeMap(res => {
                if(res instanceof RequestContext) return of(res);
                if (getClass(res) === Object) {
                    const packet = res as PacketData;
                    if (!(packet.url || packet.topic || packet.headers || packet.payload)) {
                        return throwError(() => new NotSupportedExecption(`${context.options.group ?? ''} ${context.options.name ?? ''} incoming is not packet data!`));
                    }
                    res = new PacketIncoming(packet, context.options);
                }
                return this.codings.decode(res, context);
            })
        );
    }
}



