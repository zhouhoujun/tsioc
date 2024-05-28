import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Backend, CanActivate, Handler, Interceptor, createHandler } from '@tsdi/core';
import { Observable } from 'rxjs';
import { CodingsOpts } from './options';
import { CodingsContext } from './context';
import { Decoder } from './Decoder';
import { Codings } from './Codings';


/**
 * Decodings Handler
 */
@Abstract()
export abstract class DecodingsHandler implements Handler<any, any, CodingsContext> {
    abstract handle(input: any, context: CodingsContext): Observable<any>
}

/**
 * Decodings Backend
 */
@Injectable()
export class DecodingsBackend implements Backend<any, any, CodingsContext> {
    constructor(protected codings: Codings) { }

    handle(input: any, context: CodingsContext): Observable<any> {
        return this.codings.deepDecode(input, context);
    }
}


/**
 *  decodings interceptors.
 */
export const DECODINGS_INTERCEPTORS = tokenId<Interceptor<Buffer, any, CodingsContext>[]>('DECODINGS_INTERCEPTORS');

/**
 *  decodings filters.
 */
export const DECODINGS_FILTERS = tokenId<Interceptor<Buffer, any, CodingsContext>[]>('DECODINGS_FILTERS');

/**
 *  decodings guards.
 */
export const DECODINGS_GUARDS = tokenId<CanActivate[]>('DECODINGS_GUARDS');


/**
 * Decodings
 */
export class Decodings extends Decoder {

    constructor(readonly handler: DecodingsHandler) {
        super()
    }

}

/**
 * Decodings factory
 */
@Injectable()
export class DecodingsFactory {
    create(injector: Injector, options: CodingsOpts): Decodings {
        const handler = createHandler(injector, {
            guardsToken: DECODINGS_GUARDS,
            interceptorsToken: DECODINGS_INTERCEPTORS,
            filtersToken: DECODINGS_FILTERS,
            backend: DecodingsBackend,
            ...options.decodings
        }) as DecodingsHandler;

        return new Decodings(handler)
    }
}

