import { Abstract, Injectable, Injector, Module, isString, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Decoder, InputContext } from '@tsdi/common';
import { Observable, of, throwError } from 'rxjs';
import { InvalidJsonException } from '../../execptions';



@Injectable()
export class JsonDecodeBackend implements Backend<Buffer | string, any, InputContext> {
    handle(input: Buffer | string, context: InputContext): Observable<any> {
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
export abstract class JsonDecodeHandler implements Handler<Buffer | string, any, InputContext> {
    abstract handle(input: Buffer, context: InputContext): Observable<any>
}

@Injectable()
export class EmptyJsonDecodeInterceptor implements Interceptor<Buffer | string, any, InputContext> {
    intercept(input: string | Buffer, next: Handler<string | Buffer, any>, context: InputContext): Observable<any> {
        const data = isString(input) ? input : (input.length ? new TextDecoder().decode(input) : '');
        if (!data) return of({});
        return next.handle(data);
    }

}

export const JSON_DECODE_INTERCEPTORS = tokenId<Interceptor<Buffer | string, any>[]>('JSON_DECODE_INTERCEPTORS');

@Injectable({ static: false })
export class JsonDecodeInterceptingHandler extends InterceptingHandler<Buffer, any, InputContext>  {
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

