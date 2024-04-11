import { Abstract, Injectable, Injector, Module, Optional, getClass, getClassName, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Decoder, CodingsContext, CodingMappings, NotSupportedExecption, PacketData, JsonIncoming, JsonOutgoing } from '@tsdi/common/transport';
import { RequestContext, RequestContextFactory } from '../RequestContext';
import { Observable, mergeMap, of, throwError } from 'rxjs';
import { TransportSession } from '../transport.session';





@Abstract()
export abstract class IncomingDecodeHandler implements Handler<any, RequestContext, CodingsContext> {
    abstract handle(input: any, context: CodingsContext): Observable<RequestContext>
}


@Injectable()
export class JsonIncomingDecodeHandler implements IncomingDecodeHandler {

    handle(input: PacketData, context: CodingsContext): Observable<RequestContext> {
        if (!(input.url || input.topic || input.headers || input.payload)) {
            return throwError(() => new NotSupportedExecption(`${context.options.transport}${context.options.microservice ? ' microservice' : ''} incoming is not packet data!`));
        }
        const session = context.session as TransportSession;
        const injector = context.session.injector;

        return of(injector.get(RequestContextFactory).create(session, new JsonIncoming(input), new JsonOutgoing(input), session.options));
    }
}

@Injectable()
export class IncomingDecodeBackend implements Backend<any, RequestContext, CodingsContext> {

    constructor(
        private mappings: CodingMappings,
        @Optional() private jsonHandler: JsonIncomingDecodeHandler
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
            if (this.jsonHandler) return this.jsonHandler.handle(input, context)
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