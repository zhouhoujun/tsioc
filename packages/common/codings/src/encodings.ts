import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Backend, CanActivate, ExecptionHandlerFilter, Handler, Interceptor, createHandler } from '@tsdi/core';
import { Observable } from 'rxjs';
import { CodingsOpts } from './options';
import { CodingsContext } from './context';
import { Encoder } from './Encoder';
import { Codings } from './Codings';

/**
 * Encodings Handler
 */
@Abstract()
export abstract class EncodingsHandler<TInput = any, TOutput = any> implements Handler<TInput, TOutput, CodingsContext> {
    abstract handle(input: TInput, context: CodingsContext): Observable<TOutput>
}


/**
 * Encodings Backend
 */
@Injectable()
export class EncodingsBackend<TInput = any, TOutput = any> implements Backend<TInput, TOutput, CodingsContext> {

    constructor(protected codings: Codings) { }

    handle(input: TInput, context: CodingsContext): Observable<TOutput> {
        return this.codings.deepEncode(input, context);
    }
}


/**
 * Encodings interceptors.
 */
export const ENCODINGS_INTERCEPTORS = tokenId<Interceptor<any, any, CodingsContext>[]>('ENCODINGS_INTERCEPTORS');


/**
 *  Encodings filters.
 */
export const ENCODINGS_FILTERS = tokenId<Interceptor<any, any, CodingsContext>[]>('ENCODINGS_FILTERS');


/**
 *  Encodings guards.
 */
export const ENCODINGS_GUARDS = tokenId<CanActivate[]>('ENCODINGS_GUARDS');


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
            interceptorsToken: ENCODINGS_INTERCEPTORS,
            filtersToken: ENCODINGS_FILTERS,
            guardsToken: ENCODINGS_GUARDS,
            backend: EncodingsBackend,
            ...options.encodings
        });
        
        handler.useFilters(ExecptionHandlerFilter);

        return new Encodings(handler)
    }
}


