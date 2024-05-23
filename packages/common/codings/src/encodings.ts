import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Backend, Handler, Interceptor, createHandler } from '@tsdi/core';
import { Observable } from 'rxjs';
import { CodingsOpts } from './options';
import { CodingsContext } from './context';
import { Encoder } from './Encoder';
import { Codings } from './Codings';

/**
 * Encodings Handler
 */
@Abstract()
export abstract class EncodingsHandler implements Handler<any, any, CodingsContext> {
    abstract handle(input: Buffer, context: CodingsContext): Observable<any>
}


/**
 * Encodings Backend
 */
@Injectable()
export class EncodingsBackend implements Backend<any, any, CodingsContext> {

    constructor(private codings: Codings) { }

    handle(input: any, context: CodingsContext): Observable<any> {
        return this.codings.deepEncode(input, context);
    }
}


/**
 * global encodings interceptors.
 */
export const GLOBAL_ENCODINGS_INTERCEPTORS = tokenId<Interceptor<any, any, CodingsContext>[]>('GLOBAL_ENCODINGS_INTERCEPTORS');

/**
 * Encodings interceptors.
 */
export const ENCODINGS_INTERCEPTORS = tokenId<Interceptor<any, Buffer, CodingsContext>[]>('ENCODINGS_INTERCEPTORS');


/**
 *  Encodings filters.
 */
export const ENCODINGS_FILTERS = tokenId<Interceptor<any, Buffer, CodingsContext>[]>('ENCODINGS_FILTERS');


/**
 *  global Encodings filters.
 */
export const GLOBAL_ENCODINGS_FILTERS = tokenId<Interceptor<any, Buffer, CodingsContext>[]>('GLOBAL_ENCODINGS_FILTERS');


/**
 * Encodings
 */
export class Encodings extends Encoder {

    constructor(readonly handler: EncodingsHandler) {
        super()
    }

}

/**
 * Encodings factory.
 */
@Injectable()
export class EncodingsFactory {
    create(injector: Injector, options: CodingsOpts): Encodings {
        const handler = createHandler(injector, {
            globalInterceptorsToken: GLOBAL_ENCODINGS_INTERCEPTORS,
            interceptorsToken: ENCODINGS_INTERCEPTORS,
            globalFiltersToken: GLOBAL_ENCODINGS_FILTERS,
            filtersToken: ENCODINGS_FILTERS,
            backend: EncodingsBackend,
            ...options
        }) as EncodingsHandler;
        return new Encodings(handler)
    }
}


