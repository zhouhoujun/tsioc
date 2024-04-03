import { Abstract, Injectable, Injector, Module, getClass, getClassName, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Decoder, CodingsContext, CodingMappings, NotSupportedExecption, PacketData } from '@tsdi/common/transport';
import { RequestContext } from '../RequestContext';
import { Observable, mergeMap, of, throwError } from 'rxjs';





@Abstract()
export abstract class IncomingDecodeHandler implements Handler<PacketData, RequestContext, CodingsContext> {
    abstract handle(input: PacketData, context: CodingsContext): Observable<RequestContext>
}



@Injectable()
export class IncomingDecodeBackend implements Backend<any, RequestContext, CodingsContext> {
    
    constructor(private mappings: CodingMappings) { }

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
            return throwError(() => new NotSupportedExecption('No decodings handler for incoming type:' + getClassName(type)));
        }

    }
}



export const INCOMING_DECODE_INTERCEPTORS = tokenId<Interceptor<RequestContext, PacketData>[]>('INCOMING_DECODE_INTERCEPTORS');

@Injectable({ static: false })
export class IncomingDecodeInterceptingHandler extends InterceptingHandler<PacketData, RequestContext>  {
    constructor(backend: IncomingDecodeBackend, injector: Injector) {
        super(backend, () => injector.get(INCOMING_DECODE_INTERCEPTORS, []))
    }
}


@Injectable()
export class IncomingDecoder extends Decoder<PacketData, RequestContext> implements Interceptor<any, RequestContext, CodingsContext> {

    constructor(readonly handler: IncomingDecodeHandler) {
        super()
    }

    intercept(input: PacketData, next: Handler<any, RequestContext, CodingsContext>, context: CodingsContext): Observable<RequestContext> {
        return this.handler.handle(input, context).pipe(
            mergeMap(output => next.handle(output, context.next(output))));
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