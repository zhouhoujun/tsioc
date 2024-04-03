import { Abstract, Injectable, Injector, Module, isPromise, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Observable, from, isObservable, mergeMap, of, throwError } from 'rxjs';
import { Encoder, CodingsContext } from '../../codings';


@Injectable()
export class JsonEncodeBackend implements Backend<any, Buffer, CodingsContext> {
    handle(input: any, context: CodingsContext): Observable<Buffer> {
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
export abstract class JsonEncodeHandler implements Handler<any, Buffer, CodingsContext> {
    abstract handle(input: any, context: CodingsContext): Observable<Buffer>
}

export const JSON_ENCODE_INTERCEPTORS = tokenId<Interceptor<any, Buffer, CodingsContext>[]>('JSON_ENCODE_INTERCEPTORS');

@Injectable({ static: false })
export class JsonEncodeInterceptingHandler extends InterceptingHandler<any, Buffer, CodingsContext>  {
    constructor(backend: JsonEncodeBackend, injector: Injector) {
        super(backend, () => injector.get(JSON_ENCODE_INTERCEPTORS, []))
    }
}

@Injectable()
export class AysncJsonEncodeInterceptor implements Interceptor<any, Buffer, CodingsContext> {
    intercept(input: any, next: Handler<any, Buffer>, context: CodingsContext): Observable<Buffer> {
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

