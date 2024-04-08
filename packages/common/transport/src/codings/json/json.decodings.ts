import { Abstract, Injectable, Injector, isString, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Observable, of, throwError } from 'rxjs';
import { Decoder, CodingsContext } from '../codings';
import { InvalidJsonException } from '../../execptions';



@Injectable()
export class JsonDecodeBackend implements Backend<Buffer | string, any, CodingsContext> {
    handle(input: Buffer | string, context: CodingsContext): Observable<any> {
        const jsonStr = isString(input) ? input : new TextDecoder().decode(input);
        try {
            const buff = JSON.parse(jsonStr);
            return of(buff);
        } catch (err) {
            return throwError(() => new InvalidJsonException(err, jsonStr));
        }
    }
}

@Abstract()
export abstract class JsonDecodeHandler implements Handler<Buffer | string, any, CodingsContext> {
    abstract handle(input: Buffer, context: CodingsContext): Observable<any>
}

@Injectable()
export class EmptyJsonDecodeInterceptor implements Interceptor<Buffer | string, any, CodingsContext> {
    intercept(input: string | Buffer, next: Handler<string | Buffer, any>, context: CodingsContext): Observable<any> {
        const data = isString(input) ? input : (input.length ? new TextDecoder().decode(input) : '');
        if (!data) return of({});
        return next.handle(data, context);
    }

}

export const JSON_DECODE_INTERCEPTORS = tokenId<Interceptor<Buffer | string, any>[]>('JSON_DECODE_INTERCEPTORS');

@Injectable({ static: false })
export class JsonDecodeInterceptingHandler extends InterceptingHandler<Buffer, any, CodingsContext>  {
    constructor(backend: JsonDecodeBackend, injector: Injector) {
        super(backend, () => injector.get(JSON_DECODE_INTERCEPTORS, []))
    }
}


@Injectable()
export class JsonDecoder extends Decoder<Buffer, any> {

    constructor(readonly handler: JsonDecodeHandler) {
        super()
    }
}

