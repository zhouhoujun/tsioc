import { Abstract, Injectable, Injector, Type, tokenId } from '@tsdi/ioc';
import { Backend, CanActivate, ExecptionHandlerFilter, Handler, Interceptor, createHandler } from '@tsdi/core';
import { Observable, finalize, mergeMap, of } from 'rxjs';
import { CodingsOptions, CodingsHandlerOptions } from './options';
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
                    if (context.isCompleted(data)) return of(data);
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

    readonly defaultMaps: Map<Type | string, Type | string>;

    constructor(
        protected handler: DecodingsHandler,
        protected options: CodingsOptions
    ) {
        this.defaultMaps = new Map(options.defaults);
    }

    /**
     * decode inport
     * @param input 
     */
    decode(input: any, context?: any): Observable<any> {
        let ctx: CodingsContext;
        if (context instanceof CodingsContext) {
            ctx = context
        } else {
            ctx = this.createContext();
            if (context) {
                ctx.next(context);
                context = null;
            }
        }
        ctx.next(input);
        return this.handler.handle(input, ctx)
            .pipe(
                finalize(() => !context && ctx.onDestroy()),
            );
    }


    protected createContext() {
        return new CodingsContext(this.options, this.defaultMaps)
    }
}


/**
 * Decodings factory
 */
@Injectable()
export class DecodingsFactory {
    create(injector: Injector, options: CodingsHandlerOptions): Decodings {
        const { configable, ...opts } = options;
        const handler = createHandler(injector, {
            guardsToken: DECODINGS_GUARDS,
            interceptorsToken: DECODINGS_INTERCEPTORS,
            filtersToken: DECODINGS_FILTERS,
            backend: DecodingsBackend,
            ...configable
        });

        handler.useFilters(ExecptionHandlerFilter, 0);

        return new Decodings(handler, opts)
    }
}

