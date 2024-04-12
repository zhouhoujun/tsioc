import { Abstract, Injectable, Injector, Module, Optional, getClass, getClassName, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Encoder, CodingsContext, CodingMappings, NotSupportedExecption, PacketData, Packet, JsonOutgoing } from '@tsdi/common/transport';
import { Observable, mergeMap, of, throwError } from 'rxjs';
import { RequestContext } from '../RequestContext';



@Abstract()
export abstract class OutgoingEncodeHandler implements Handler<RequestContext, any, CodingsContext> {
    abstract handle(input: RequestContext, context: CodingsContext): Observable<PacketData>
}


@Injectable()
export class JsonOutgoingEncodeHandler implements OutgoingEncodeHandler {

    handle(input: RequestContext, context: CodingsContext): Observable<any> {
        if (!(input.response instanceof JsonOutgoing)) {
            return throwError(() => new NotSupportedExecption(`${context.options.transport}${context.options.microservice ? ' microservice' : ''} incoming is not packet data!`));
        }

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
            packet.payload = response.body;
        }

        return of(packet);
    }
}

@Injectable()
export class OutgoingEncodeBackend implements Backend<RequestContext, any, CodingsContext> {
    constructor(
        private mappings: CodingMappings,
        @Optional() private jsonHandler: JsonOutgoingEncodeHandler) { }

    handle(input: RequestContext, context: CodingsContext): Observable<any> {
        const type = getClass(input.response ?? input);
        const handlers = this.mappings.getEncodings(context.options).getHanlder(type);

        if (handlers && handlers.length) {
            return handlers.reduceRight((obs$, curr) => {
                return obs$.pipe(
                    mergeMap(input => curr.handle(input, context.next(input)))
                );
            }, of(input))
        } else {
            if (this.jsonHandler) return this.jsonHandler.handle(input, context)
            return throwError(() => new NotSupportedExecption(`No encodings handler for ${context.options.transport}${context.options.microservice ? ' microservice' : ''} outgoing type: ${getClassName(type)}`));
        }

    }
}

export const OUTGOING_ENCODE_INTERCEPTORS = tokenId<Interceptor<RequestContext, PacketData>[]>('OUTGOING_ENCODE_INTERCEPTORS');

@Injectable({ static: false })
export class OutgoingEncodeInterceptingHandler extends InterceptingHandler<RequestContext, PacketData> {
    constructor(backend: OutgoingEncodeBackend, injector: Injector) {
        super(backend, () => injector.get(OUTGOING_ENCODE_INTERCEPTORS, []))
    }
}


@Injectable()
export class OutgoingEncoder extends Encoder<RequestContext, PacketData> implements Interceptor<any, PacketData, CodingsContext> {

    constructor(readonly handler: OutgoingEncodeHandler) {
        super()
    }

    intercept(input: RequestContext, next: Handler<any, PacketData<any>, CodingsContext>, context: CodingsContext): Observable<PacketData<any>> {
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