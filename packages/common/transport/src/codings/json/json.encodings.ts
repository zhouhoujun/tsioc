import { Abstract, Injectable, Injector, Module, isPromise, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Encoder, InputContext } from '@tsdi/common';
import { Observable, from, isObservable, mergeMap, of, throwError } from 'rxjs';


@Injectable()
export class JsonEncodeBackend implements Backend<any, Buffer, InputContext> {
    handle(input: any, context: InputContext): Observable<Buffer> {
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
export abstract class JsonEncodeHandler implements Handler<any, Buffer, InputContext> {
    abstract handle(input: any, context: InputContext): Observable<Buffer>
}

export const JSON_ENCODE_INTERCEPTORS = tokenId<Interceptor<any, Buffer, InputContext>[]>('JSON_ENCODE_INTERCEPTORS');

@Injectable()
export class JsonEncodeInterceptingHandler extends InterceptingHandler<any, Buffer, InputContext>  {
    constructor(backend: JsonEncodeBackend, injector: Injector) {
        super(backend, () => injector.get(JSON_ENCODE_INTERCEPTORS, []))
    }
}

@Injectable()
export class AysncJsonEncodeInterceptor implements Interceptor<any, Buffer, InputContext> {
    intercept(input: any, next: Handler<any, Buffer>, context: InputContext): Observable<Buffer> {
        if (isPromise(input)) return from(input).pipe(mergeMap(v => next.handle(v, context)));
        if (isObservable(input)) return input.pipe(mergeMap(v => next.handle(v, context)));
        return next.handle(input, context);
    }
}


@Injectable()
export class JsonEncoder extends Encoder<any, Buffer> {

    constructor(readonly handler: JsonEncodeHandler) {
        super()
    }
}

