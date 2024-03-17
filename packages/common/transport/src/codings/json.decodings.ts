import { Abstract, Injectable, Injector, Module, isString, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Decoder } from '@tsdi/common';
import { Observable, of, throwError } from 'rxjs';
import { InvalidJsonException } from '../execptions';



@Injectable()
export class JsonDecodeBackend implements Backend<Buffer | string, any> {
    handle(input: Buffer | string): Observable<any> {
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
export abstract class JsonDecodeHandler implements Handler<Buffer | string, any> {
    abstract handle(input: Buffer): Observable<any>
}

@Injectable()
export class EmptyJsonDecodeInterceptor implements Interceptor<Buffer | string, any> {
    intercept(input: string | Buffer, next: Handler<string | Buffer, any>): Observable<any> {
        const data = isString(input) ? input : (input.length ? new TextDecoder().decode(input) : '');
        if (!data) return of({});
        return next.handle(data);
    }

}

export const JSON_DECODE_INTERCEPTORS = tokenId<Interceptor<Buffer | string, any>[]>('JSON_DECODE_INTERCEPTORS');

@Injectable()
export class JsonDecodeInterceptingHandler extends InterceptingHandler<Buffer, any>  {
    constructor(backend: JsonDecodeBackend, injector: Injector) {
        super(backend, () => injector.get(JSON_DECODE_INTERCEPTORS))
    }
}


@Injectable()
export class JsonDecoder extends Decoder<Buffer, any> {

    constructor(readonly handler: JsonDecodeHandler) {
        super()
    }
}


@Module({
    providers: [
        { provide: JSON_DECODE_INTERCEPTORS, useClass: EmptyJsonDecodeInterceptor, multi: true },
        { provide: JsonDecodeHandler, useClass: JsonDecodeInterceptingHandler },
        JsonDecoder,
    ]
})
export class JsonDecodingsModule {

}