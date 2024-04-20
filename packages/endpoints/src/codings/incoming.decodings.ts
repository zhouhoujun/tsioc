import { Injectable, Type, getClass, getClassName, isString } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { CodingsContext, CodingMappings, NotSupportedExecption, PacketData, PacketIncoming, PacketOutgoing, DecodeHandler } from '@tsdi/common/transport';
import { RequestContextFactory } from '../RequestContext';
import { Observable, mergeMap, of, throwError } from 'rxjs';
import { TransportSession } from '../transport.session';



@Injectable({ static: true })
export class IncomingDecodingsHandlers {

    @DecodeHandler('incoming-message')
    handleResponseIncoming(context: CodingsContext) {
        const input = context.last<PacketData>();
        if (!(input.url || input.topic || input.headers || input.payload)) {
            return throwError(() => new NotSupportedExecption(`${context.options.transport}${context.options.microservice ? ' microservice' : ''} incoming is not packet data!`));
        }
        const session = context.session as TransportSession;
        const injector = session.injector;

        return injector.get(RequestContextFactory).create(session, new PacketIncoming(input, context.options), new PacketOutgoing(input, context.options), session.options);
    }

}



@Injectable()
export class IncomingDecodeInterceper implements Interceptor<any, any, CodingsContext> {

    constructor(private mappings: CodingMappings) {
    }

    intercept(input: any, next: Handler<any, any, CodingsContext>, context: CodingsContext): Observable<any> {
        return next.handle(input, context).pipe(
            mergeMap(res => {
                const transport = context.options.transport;
                let type: Type | string = getClass(res);
                if (type === Object) {
                    const packet = res as PacketData;
                    if (!(packet.url || packet.topic || packet.headers || packet.payload)) {
                        return throwError(() => new NotSupportedExecption(`${transport}${context.options.microservice ? ' microservice' : ''} incoming is not packet data!`));
                    }
                    type = 'incoming-message';
                    context.next(packet);
                }
                const handlers = this.mappings.getDecodeHanlders(type, context.options);

                if (handlers && handlers.length) {
                    return handlers.reduceRight((obs$, curr) => {
                        return obs$.pipe(
                            mergeMap(i => curr.handle(i, context.next(i)))
                        );
                    }, of(res))
                } else {
                    return throwError(() => new NotSupportedExecption(`No encodings handler for ${transport}${context.options.microservice ? ' microservice' : ''} incoming type: ${isString(type) ? type : getClassName(type)}`))
                }
            })
        );
    }
}



