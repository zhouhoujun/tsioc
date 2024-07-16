import { Abstract, Injectable, Injector, Type, tokenId } from '@tsdi/ioc';
import { Backend, CanActivate, ExecptionHandlerFilter, Handler, Interceptor, createHandler } from '@tsdi/core';
import { Observable, finalize, mergeMap, of } from 'rxjs';
import { CodingsOptions, CodingsHandlerOptions } from './options';
import { CodingsContext } from './context';
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
                if (context.isCompleted(data)) return of(data);
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

    protected defaultMaps: Map<Type | string, Type | string>;
    constructor(
        private handler: EncodingsHandler,
        protected options: CodingsOptions
    ) {
        this.defaultMaps = new Map(options.defaults);
    }


    // /**
    //  * set target default codings as adapter.
    //  * @param target 
    //  * @param adapter 
    //  */
    // setDefault(target: Type | string, adapter: Type | string | undefined): void {
    //     if (!adapter) {
    //         this.defaultMaps.delete(target);
    //     } else {
    //         this.defaultMaps.set(target, adapter);
    //     }
    // }

    /**
     * encode inport
     * @param input 
     */
    encode(input: any, context?: any): Observable<any> {
        let ctx: CodingsContext;
        if (context instanceof CodingsContext) {
            ctx = context;
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
 * Encodings factory.
 */
@Injectable()
export class EncodingsFactory {
    create(injector: Injector, options: CodingsHandlerOptions): Encodings {
        const { configable, ...opts } = options;
        const handler = createHandler(injector, {
            interceptorsToken: ENCODINGS_INTERCEPTORS,
            filtersToken: ENCODINGS_FILTERS,
            guardsToken: ENCODINGS_GUARDS,
            backend: EncodingsBackend,
            ...configable
        });

        handler.useFilters(ExecptionHandlerFilter, 0);

        return new Encodings(handler, opts)
    }
}


