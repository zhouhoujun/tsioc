import { Abstract, Injectable, Injector, Module, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Encoder, InputContext, TransportRequest } from '@tsdi/common';
import { PacketData } from '@tsdi/common/transport';
import { Observable, mergeMap, of } from 'rxjs';




@Injectable()
export class RequestEncodeBackend implements Backend<TransportRequest, PacketData> {

    handle(input: TransportRequest<any>): Observable<PacketData> {
        const packet = {
            pattern: input.pattern,
            headers: input.headers,
            payload: input.payload,
            payloadLength: input.headers.getContentLength()
        } as PacketData;
        if (input.method) {
            packet.method = input.method;
        }
        return of(packet)
    }
}

@Abstract()
export abstract class RequestEncodeHandler implements Handler<TransportRequest, PacketData, InputContext> {
    abstract handle(input: TransportRequest, context: InputContext): Observable<PacketData>
}


export const REQUEST_ENCODE_INTERCEPTORS = tokenId<Interceptor<TransportRequest, PacketData>[]>('REQUEST_ENCODE_INTERCEPTORS');

@Injectable({ static: false })
export class RequestEncodeInterceptingHandler extends InterceptingHandler<TransportRequest, PacketData>  {
    constructor(backend: RequestEncodeBackend, injector: Injector) {
        super(backend, () => injector.get(REQUEST_ENCODE_INTERCEPTORS, []))
    }
}



@Injectable()
export class RequestEncoder extends Encoder<TransportRequest, PacketData> implements Interceptor<any, PacketData, InputContext> {

    constructor(readonly handler: RequestEncodeHandler) {
        super()
    }

    intercept(input: TransportRequest<any>, next: Handler<any, PacketData<any>, InputContext>, context: InputContext): Observable<PacketData<any>> {
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