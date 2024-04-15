import { Abstract, Injectable, Injector, Module, Optional, getClass, getClassName, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { PatternFormatter, TransportRequest } from '@tsdi/common';
import { CodingMappings, Encoder, CodingsContext, NotSupportedExecption, PacketData } from '@tsdi/common/transport';
import { Observable, mergeMap, of, throwError } from 'rxjs';




@Abstract()
export abstract class RequestEncodeHandler implements Handler<TransportRequest, PacketData, CodingsContext> {
    abstract handle(input: TransportRequest, context: CodingsContext): Observable<PacketData>
}

@Injectable()
export class DefaultRequestHandler implements RequestEncodeHandler {
    handle(input: TransportRequest, context: CodingsContext): Observable<PacketData> {
        const packet = {
            url: input.urlWithParams,
            headers: input.headers,
            payload: input.payload,
            payloadLength: input.headers.getContentLength()
        } as PacketData;
        if (!packet.url && input.pattern) {
            packet.url = input.context.get(PatternFormatter).format(input.pattern);
        }
        if (input.method) {
            packet.method = input.method;
        }
        return of(packet)
    }
}



@Injectable()
export class RequestEncodeBackend implements Backend<TransportRequest, PacketData> {

    constructor(
        private mappings: CodingMappings,
        @Optional() private defaultHandler: DefaultRequestHandler
    ) { }

    handle(input: TransportRequest<any>, context: CodingsContext): Observable<PacketData> {
        const type = getClass(input);
        const handlers = this.mappings.getEncodings(context.options).getHanlder(type);

        if (handlers && handlers.length) {
            return handlers.reduceRight((obs$, curr) => {
                return obs$.pipe(
                    mergeMap(input => curr.handle(input, context.next(input)))
                );
            }, of(input))
        } else {
            if (this.defaultHandler) return this.defaultHandler.handle(input, context)
            return throwError(() => new NotSupportedExecption(`No encodings handler for ${context.options.transport}${context.options.microservice ? ' microservice' : ''} request type: ${getClassName(type)}`))
        }

    }
}


export const REQUEST_ENCODE_INTERCEPTORS = tokenId<Interceptor<TransportRequest, PacketData>[]>('REQUEST_ENCODE_INTERCEPTORS');

@Injectable({ static: false })
export class RequestEncodeInterceptingHandler extends InterceptingHandler<TransportRequest, PacketData> {
    constructor(backend: RequestEncodeBackend, injector: Injector) {
        super(backend, () => injector.get(REQUEST_ENCODE_INTERCEPTORS, []))
    }
}



@Injectable()
export class RequestEncoder extends Encoder<TransportRequest, PacketData> implements Interceptor<any, PacketData, CodingsContext> {

    constructor(readonly handler: RequestEncodeHandler) {
        super()
    }

    intercept(input: TransportRequest<any>, next: Handler<any, PacketData<any>, CodingsContext>, context: CodingsContext): Observable<PacketData<any>> {
        return this.handler.handle(input, context).pipe(
            mergeMap(output => next.handle(output, context.next(output))));
    }
}


@Module({
    providers: [
        RequestEncodeBackend,
        { provide: RequestEncodeHandler, useClass: RequestEncodeInterceptingHandler },
        RequestEncoder
    ]
})
export class RequestEncodingsModule {

}