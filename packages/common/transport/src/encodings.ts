import { Abstract, Injectable, Injector, Module, isPromise, tokenId } from '@tsdi/ioc';
import { Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Encoder } from '@tsdi/common';
import { Observable, from, isObservable, mergeMap, of, throwError } from 'rxjs';


@Injectable()
export class JsonEncodeBackend implements Handler<any, Buffer> {
    handle(input: any): Observable<Buffer> {
        try {
            const jsonStr = JSON.stringify(input);
            const buff = Buffer.from(jsonStr);
            return of(buff);
        } catch (err) {
            return throwError(() => err);
        }
    }
}

@Abstract()
export abstract class JsonEncodeHandler implements Handler<any, Buffer> {
    abstract handle(input: any): Observable<Buffer>
}

export const JSON_ENCODE_INTERCEPTORS = tokenId<Interceptor<any, Buffer>[]>('JSON_ENCODE_INTERCEPTORS');

@Injectable()
export class JsonEncodeInterceptingHandler extends InterceptingHandler<any, Buffer>  {
    constructor(backend: JsonEncodeBackend, injector: Injector) {
        super(backend, () => injector.get(JSON_ENCODE_INTERCEPTORS))
    }
}

@Injectable()
export class AysncJsonEncodeInterceptor implements Interceptor<any, Buffer> {
    intercept(input: any, next: Handler<any, Buffer>): Observable<Buffer> {
        if (isPromise(input)) return from(input).pipe(mergeMap(v => next.handle(v)));
        if (isObservable(input)) return input.pipe(mergeMap(v => next.handle(v)));
        return next.handle(input);
    }
}


@Injectable()
export class JsonEncoder extends Encoder<any, Buffer> {

    constructor(readonly handler: JsonEncodeHandler) {
        super()
    }
}

@Module({
    providers: [
        { provide: JSON_ENCODE_INTERCEPTORS, useClass: AysncJsonEncodeInterceptor, multi: true },
        { provide: JsonEncodeHandler, useClass: JsonEncodeInterceptingHandler },
        JsonEncoder,
    ]
})
export class JsonEncodingsModule {

}
