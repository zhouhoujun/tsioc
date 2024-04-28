import { Abstract, Injectable, Injector, isString, tokenId } from '@tsdi/ioc';
import { Backend, Handler, Interceptor, createHandler } from '@tsdi/core';
import { Observable, of, throwError } from 'rxjs';
import { CodingsOpts } from './options';
import { CodingsContext } from './context';
import { Decoder } from './Decoder';
import { InvalidJsonException } from '../execptions';


@Abstract()
export abstract class DecodingsHandler implements Handler<any, any, CodingsContext> {
    abstract handle(input: any, context: CodingsContext): Observable<any>
}

@Injectable()
export class DecodingsBackend implements Backend<any, any, CodingsContext> {

    handle(input: any, context: CodingsContext): Observable<any> {
        const jsonStr = isString(input) ? input : new TextDecoder().decode(input);
        try {
            const buff = JSON.parse(jsonStr);
            return of(buff);
        } catch (err) {
            return throwError(() => new InvalidJsonException(err, jsonStr));
        }
    }
}


/**
 * endpoint decodings interceptors.
 */
export const ENDPOINT_DECODINGS_INTERCEPTORS = tokenId<Interceptor<any, any, CodingsContext>[]>('ENDPOINT_DECODINGS_INTERCEPTORS');
/**
 *  decodings interceptors.
 */
export const DECODINGS_INTERCEPTORS = tokenId<Interceptor<Buffer, any, CodingsContext>[]>('DECODINGS_INTERCEPTORS');


export class Decodings extends Decoder {

    constructor(readonly handler: DecodingsHandler) {
        super()
    }

}


@Injectable()
export class DecodingsFactory {
    create(injector: Injector, options: CodingsOpts): Decodings {
        const handler = createHandler(injector, {
            globalInterceptorsToken: ENDPOINT_DECODINGS_INTERCEPTORS,
            interceptorsToken: DECODINGS_INTERCEPTORS,
            backend: DecodingsBackend,
            ...options?.decodes
        }) as DecodingsHandler;

        return new Decodings(handler)
    }
}

