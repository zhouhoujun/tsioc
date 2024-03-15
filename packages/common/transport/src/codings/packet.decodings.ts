import { Abstract, Injectable, Injector, Module, isString, tokenId } from '@tsdi/ioc';
import { Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Decoder } from '@tsdi/common';
import { Observable, of } from 'rxjs';



@Injectable()
export class PacketDecodeBackend implements Handler<Buffer | string, any> {
    handle(input: Buffer | string): Observable<any> {
        
    }
}

@Abstract()
export abstract class PacketDecodeHandler implements Handler<Buffer | string, any> {
    abstract handle(input: Buffer): Observable<any>
}

@Injectable()
export class EmptyPacketDecodeInterceptor implements Interceptor<Buffer | string, any> {
    intercept(input: string | Buffer, next: Handler<string | Buffer, any>): Observable<any> {
        const data = isString(input) ? input : (input.length ? new TextDecoder().decode(input) : '');
        if (!data) return of({});
        return next.handle(data);
    }

}

export const PACKET_DECODE_INTERCEPTORS = tokenId<Interceptor<Buffer | string, any>[]>('PACKET_DECODE_INTERCEPTORS');

@Injectable()
export class PacketDecodeInterceptingHandler extends InterceptingHandler<Buffer, any>  {
    constructor(backend: PacketDecodeBackend, injector: Injector) {
        super(backend, () => injector.get(PACKET_DECODE_INTERCEPTORS))
    }
}


@Injectable()
export class PacketDecoder extends Decoder<Buffer, any> {

    constructor(readonly handler: PacketDecodeHandler) {
        super()
    }
}


@Module({
    providers: [
        { provide: PACKET_DECODE_INTERCEPTORS, useClass: EmptyPacketDecodeInterceptor, multi: true },
        { provide: PacketDecodeHandler, useClass: PacketDecodeInterceptingHandler },
        PacketDecoder,
    ]
})
export class PacketDecodingsModule {

}