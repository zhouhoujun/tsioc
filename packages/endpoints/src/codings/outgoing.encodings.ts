import { Abstract, Injectable, Injector, Module, getClass, getClassName, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Encoder, InputContext, CodingMappings, NotSupportedExecption, PacketData } from '@tsdi/common/transport';
import { Observable, mergeMap, of, throwError } from 'rxjs';
import { RequestContext } from '../RequestContext';



@Abstract()
export abstract class OutgoingEncodeHandler implements Handler<RequestContext, any, InputContext> {
    abstract handle(input: RequestContext, context: InputContext): Observable<PacketData>
}


@Injectable()
export class OutgoingEncodeBackend implements Backend<RequestContext, any, InputContext> {
    constructor(private mappings: CodingMappings) { }

    handle(input: RequestContext, context: InputContext): Observable<any> {
        const type = getClass(input.response ?? input);
        const handlers = this.mappings.getEncodings(context.codingsType).getHanlder(type);

        if (handlers && handlers.length) {
            return handlers.reduceRight((obs$, curr) => {
                return obs$.pipe(
                    mergeMap(input => curr.handle(input, context.next(input)))
                );
            }, of(input))
        } else {
            return throwError(() => new NotSupportedExecption('No encodings handler for outgoing type:' + getClassName(type)));
        }

    }
}

export const OUTGOING_ENCODE_INTERCEPTORS = tokenId<Interceptor<RequestContext, PacketData>[]>('OUTGOING_ENCODE_INTERCEPTORS');

@Injectable({ static: false })
export class OutgoingEncodeInterceptingHandler extends InterceptingHandler<RequestContext, PacketData>  {
    constructor(backend: OutgoingEncodeBackend, injector: Injector) {
        super(backend, () => injector.get(OUTGOING_ENCODE_INTERCEPTORS, []))
    }
}


@Injectable()
export class OutgoingEncoder extends Encoder<RequestContext, PacketData> implements Interceptor<any, PacketData, InputContext> {

    constructor(readonly handler: OutgoingEncodeHandler) {
        super()
    }

    intercept(input: RequestContext, next: Handler<any, PacketData<any>, InputContext>, context: InputContext): Observable<PacketData<any>> {
        return this.handler.handle(input, context).pipe(
            mergeMap(output => next.handle(output, context.next(output))));
    }
}


@Module({
    providers: [
        OutgoingEncodeBackend,
        { provide: OutgoingEncodeHandler, useClass: OutgoingEncodeInterceptingHandler },
        OutgoingEncoder
    ]
})
export class OutgoingEncodingsModule {

}