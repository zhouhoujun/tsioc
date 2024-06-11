import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Backend, CanActivate, ExecptionHandlerFilter, Handler, Interceptor, createHandler } from '@tsdi/core';
import { Observable, mergeMap, of } from 'rxjs';
import { CodingsOpts } from './options';
import { CodingsContext } from './context';
import { Decoder } from './Decoder';
import { CodingMappings } from './mappings';


/**
 * Decodings Handler
 */
@Abstract()
export abstract class DecodingsHandler<TInput = any, TOutput = any> implements Handler<TInput, TOutput, CodingsContext> {
    abstract handle(input: TInput, context: CodingsContext): Observable<TOutput>
}

/**
 * Decoding Backend
 */
@Injectable()
export class DecodingsBackend<TInput = any, TOutput = any> implements Backend<TInput, TOutput, CodingsContext> {

    constructor(protected mappings: CodingMappings) { }

    handle(input: TInput, context: CodingsContext): Observable<TOutput> {
        return this.mappings.decode(input, context)
            .pipe(
                mergeMap(data => {
                    if (context.encodeCompleted) return of(data);
                    return this.mappings.decode(data, context)
                })
            );
    }
}


/**
 *  decodings interceptors.
 */
export const DECODINGS_INTERCEPTORS = tokenId<Interceptor<any, any, CodingsContext>[]>('DECODINGS_INTERCEPTORS');

/**
 *  decodings filters.
 */
export const DECODINGS_FILTERS = tokenId<Interceptor<any, any, CodingsContext>[]>('DECODINGS_FILTERS');

/**
 *  decodings guards.
 */
export const DECODINGS_GUARDS = tokenId<CanActivate[]>('DECODINGS_GUARDS');


/**
 * Decodings
 */
export class Decodings implements Decoder {

    constructor(private handler: DecodingsHandler) { }

    /**
     * decode inport
     * @param input 
     */
    decode(input: any, context: CodingsContext): Observable<any> {
        return this.handler.handle(input, context);
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
        });

        handler.useFilters(ExecptionHandlerFilter, 0);

        return new Decodings(handler)
    }
}

