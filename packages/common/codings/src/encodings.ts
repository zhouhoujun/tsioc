import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Backend, CanActivate, ExecptionHandlerFilter, Handler, Interceptor, createHandler } from '@tsdi/core';
import { Observable, mergeMap, of } from 'rxjs';
import { CodingsOpts } from './options';
import { CodingType, CodingsContext } from './context';
import { Encoder } from './Encoder';
import { CodingMappings } from './mappings';

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

    constructor(protected mappings: CodingMappings) { }

    handle(input: TInput, context: CodingsContext): Observable<TOutput> {
        return this.mappings.encode(input, context).pipe(
            mergeMap(data => {
                if (context.isCompleted(data, CodingType.Encode)) return of(data);
                return this.mappings.encode(data, context)
            })
        );
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
export class Encodings implements Encoder {

    constructor(private handler: EncodingsHandler) { }

    /**
     * encode inport
     * @param input 
     */
    encode(input: any, context: CodingsContext): Observable<any> {
        return this.handler.handle(input, context);
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

        handler.useFilters(ExecptionHandlerFilter, 0);

        return new Encodings(handler)
    }
}


