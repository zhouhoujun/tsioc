import { Abstract, Injectable, Injector, Module, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Encoder, TransportRequest } from '@tsdi/common';
import { PacketData } from '@tsdi/common/transport';
import { Observable, of } from 'rxjs';




@Injectable()
export class RequestEncodeBackend implements Backend<TransportRequest, PacketData> {

    handle(input: TransportRequest<any>): Observable<PacketData> {
        return of({
            // type: input.responseType,
            headers: input.headers.getHeaders(),
            payload: input.body
        })
    }
}

@Abstract()
export abstract class RequestEncodeHandler implements Handler<TransportRequest, PacketData> {
    abstract handle(input: TransportRequest): Observable<PacketData>
}


export const REQUEST_ENCODE_INTERCEPTORS = tokenId<Interceptor<TransportRequest, PacketData>[]>('REQUEST_ENCODE_INTERCEPTORS');

@Injectable()
export class RequestEncodeInterceptingHandler extends InterceptingHandler<TransportRequest, PacketData>  {
    constructor(backend: RequestEncodeBackend, injector: Injector) {
        super(backend, () => injector.get(REQUEST_ENCODE_INTERCEPTORS))
    }
}

@Injectable()
export class RequestCompressEncodeInterceptor implements Interceptor<TransportRequest, PacketData> {
    intercept(input: TransportRequest<any>, next: Handler<TransportRequest<any>, PacketData<any>>): Observable<PacketData<any>> {
        return next.handle(input);
    }
}


@Injectable()
export class RequestEncoder extends Encoder<TransportRequest, PacketData> {

    constructor(readonly handler: RequestEncodeHandler) {
        super()
    }
}


@Module({
    providers: [
        { provide: REQUEST_ENCODE_INTERCEPTORS, useClass: RequestCompressEncodeInterceptor, multi: true },
        { provide: RequestEncodeHandler, useClass: RequestEncodeInterceptingHandler },
        RequestEncoder
    ]
})
export class RequestEncodingsModule {

}