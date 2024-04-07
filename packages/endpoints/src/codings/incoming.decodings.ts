import { Abstract, Injectable, Injector, Module, Optional, getClass, getClassName, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Decoder, CodingsContext, CodingMappings, NotSupportedExecption, PacketData } from '@tsdi/common/transport';
import { IncomingFactory, OutgoingFactory, RequestContext, RequestContextFactory } from '../RequestContext';
import { Observable, mergeMap, of, throwError } from 'rxjs';
import { TransportSession } from '../transport.session';





@Abstract()
export abstract class IncomingDecodeHandler implements Handler<any, RequestContext, CodingsContext> {
    abstract handle(input: any, context: CodingsContext): Observable<RequestContext>
}

@Injectable()
export class PacketIncomingHanlder implements IncomingDecodeHandler {

    handle(input: PacketData, context: CodingsContext): Observable<RequestContext> {
        if (!(input.url || input.topic || input.headers || input.payload)) {
            return throwError(() => new NotSupportedExecption(`${context.options.transport}${context.options.microservice ? ' microservice' : ''} incoming is not packet data!`));
        }
        const session = context.session as TransportSession;
        const injector = context.session.injector;
        return of(injector.get(RequestContextFactory).create(session, injector.get(IncomingFactory).create(session, input), injector.get(OutgoingFactory).create(session, input), session.options));
    }
}

@Injectable()
export class IncomingDecodeBackend implements Backend<any, RequestContext, CodingsContext> {

    constructor(
        private mappings: CodingMappings,
        @Optional() private packetHandler: PacketIncomingHanlder
    ) { }

    handle(input: any, context: CodingsContext): Observable<RequestContext> {
        const type = getClass(input?.incoming ?? input);
        const handlers = this.mappings.getDecodings(context.options).getHanlder(type);

        if (handlers && handlers.length) {
            return handlers.reduceRight((obs$, curr) => {
                return obs$.pipe(
                    mergeMap(input => curr.handle(input, context.next(input)))
                );
            }, of(input))
        } else {
            if (this.packetHandler) return this.packetHandler.handle(input, context)
            return throwError(() => new NotSupportedExecption(`No decodings handler for ${context.options.transport}${context.options.microservice ? ' microservice' : ''} incoming type: ${getClassName(type)}`));
        }

    }
}



export const INCOMING_DECODE_INTERCEPTORS = tokenId<Interceptor<RequestContext, any>[]>('INCOMING_DECODE_INTERCEPTORS');

@Injectable({ static: false })
export class IncomingDecodeInterceptingHandler extends InterceptingHandler<any, RequestContext>  {
    constructor(backend: IncomingDecodeBackend, injector: Injector) {
        super(backend, () => injector.get(INCOMING_DECODE_INTERCEPTORS, []))
    }
}


@Injectable()
export class IncomingDecoder extends Decoder<any, RequestContext> implements Interceptor<any, RequestContext, CodingsContext> {

    constructor(readonly handler: IncomingDecodeHandler) {
        super()
    }

    intercept(input: any, next: Handler<any, RequestContext, CodingsContext>, context: CodingsContext): Observable<RequestContext> {
        return next.handle(input, context).pipe(
            mergeMap(output => this.handler.handle(output, context.next(output))));
    }
}



@Module({
    providers: [
        IncomingDecodeBackend,
        { provide: IncomingDecodeHandler, useClass: IncomingDecodeInterceptingHandler },
        IncomingDecoder
    ]
})
export class IncomingDecodingsModule {

}