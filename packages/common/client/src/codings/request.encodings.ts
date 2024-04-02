import { Abstract, Injectable, Injector, Module, getClass, getClassName, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Encoder, InputContext, TransportRequest } from '@tsdi/common';
import { Mappings, NotSupportedExecption, PacketData } from '@tsdi/common/transport';
import { Observable, mergeMap, of, throwError } from 'rxjs';




@Abstract()
export abstract class RequestEncodeHandler implements Handler<TransportRequest, PacketData, InputContext> {
    abstract handle(input: TransportRequest, context: InputContext): Observable<PacketData>
}


@Injectable({
    static: true,
    providedIn: 'root'
})
export class RequestMappings extends Mappings {

}


@Injectable()
export class RequestEncodeBackend implements Backend<TransportRequest, PacketData> {

    constructor(private mappings: RequestMappings) { }

    handle(input: TransportRequest<any>, context: InputContext): Observable<PacketData> {
        const type = getClass(input);
        const handlers = this.mappings.getHanlder(type);

        if (handlers && handlers.length) {
            return handlers.reduceRight((obs$, curr) => {
                return obs$.pipe(
                    mergeMap(input => curr.handle(input, context.next(input)))
                );
            }, of(input))
        } else {
            return throwError(() => new NotSupportedExecption('No encodings handler for request type:' + getClassName(type)));
        }
        // const packet = {
        //     pattern: input.pattern,
        //     headers: input.headers,
        //     payload: input.payload,
        //     payloadLength: input.headers.getContentLength()
        // } as PacketData;
        // if (input.method) {
        //     packet.method = input.method;
        // }
        // return of(packet)
    }
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
        RequestMappings,
        RequestEncodeBackend,
        { provide: RequestEncodeHandler, useClass: RequestEncodeInterceptingHandler },
        RequestEncoder
    ]
})
export class RequestEncodingsModule {

}