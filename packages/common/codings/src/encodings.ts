import { Abstract, EMPTY, Injectable, Injector, Type, toProvider, tokenId } from '@tsdi/ioc';
import { Backend, CanHandle, ConfigableHandler, ConfigableHandlerOptions, ExecptionHandlerFilter, Handler, Interceptor, createHandler } from '@tsdi/core';
import { Observable, finalize, mergeMap, of } from 'rxjs';
import { CodingsOptions, CodingsHandlerOptions } from './options';
import { CodingsContext } from './context';
import { Encoder } from './Encoder';
import { CodingMappings } from './mappings';
import { CodingsAapter } from './CodingsAapter';

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
 * Encodings configable handler.
 */
export class EncodingsConfigableHandler<TInput = any, TOutput = any> extends ConfigableHandler<TInput, TOutput, ConfigableHandlerOptions, CodingsContext> { }

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
export const ENCODINGS_GUARDS = tokenId<CanHandle[]>('ENCODINGS_GUARDS');


/**
 * Encodings
 */
export class Encodings implements Encoder {

    private _adapter?: CodingsAapter | null;
    get adapter() {
        if (this._adapter === undefined) {
            this._adapter = this.handler.injector.get(CodingsAapter, null);
        }
        return this._adapter
    }


    constructor(
        private handler: EncodingsConfigableHandler,
        protected options: CodingsOptions
    ) {

    }

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
        return new CodingsContext(this.options, this.adapter)
    }

}

/**
 * Encodings factory.
 */
@Injectable()
export class EncodingsFactory {
    create(injector: Injector, options: CodingsHandlerOptions): Encodings {
        const { configable, adapter, ...opts } = options;
        const handler = createHandler(injector, {
            classType: EncodingsConfigableHandler,
            interceptorsToken: ENCODINGS_INTERCEPTORS,
            filtersToken: ENCODINGS_FILTERS,
            guardsToken: ENCODINGS_GUARDS,
            backend: EncodingsBackend,
            ...configable,
            providers: adapter ? [
                ...configable?.providers ?? EMPTY,
                toProvider(CodingsAapter, adapter)
            ] : configable?.providers
        });

        handler.useFilters(ExecptionHandlerFilter, 0);

        return new Encodings(handler, opts)
    }
}


