import { Abstract, EMPTY, Injectable, Injector, Type, toProvider, tokenId } from '@tsdi/ioc';
import { Backend, CanHandle, ConfigableHandler, ConfigableHandlerOptions, ExecptionHandlerFilter, Handler, Interceptor, createHandler } from '@tsdi/core';
import { Observable, finalize, mergeMap, of } from 'rxjs';
import { CodingsOptions, CodingsHandlerOptions } from './options';
import { CodingsContext } from './context';
import { Decoder } from './Decoder';
import { CodingMappings } from './mappings';
import { CodingsAapter } from './CodingsAapter';


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
export const DECODINGS_GUARDS = tokenId<CanHandle[]>('DECODINGS_GUARDS');

/**
 * Decodings configable handler.
 */
export class DecodingsConfigableHandler<TInput = any, TOutput = any> extends ConfigableHandler<TInput, TOutput, ConfigableHandlerOptions, CodingsContext> { }

/**
 * Decodings
 */
export class Decodings implements Decoder {

    private _adapter?: CodingsAapter | null;
    get adapter() {
        if (this._adapter === undefined) {
            this._adapter = this.handler.injector.get(CodingsAapter, null);
        }
        return this._adapter
    }


    constructor(
        protected handler: DecodingsConfigableHandler,
        protected options: CodingsOptions
    ) {
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
        return new CodingsContext(this.options, this.adapter)
    }
}


/**
 * Decodings factory
 */
@Injectable()
export class DecodingsFactory {
    create(injector: Injector, options: CodingsHandlerOptions): Decodings {
        const { configable, adapter, ...opts } = options;
        const handler = createHandler(injector, {
            classType: DecodingsConfigableHandler,
            guardsToken: DECODINGS_GUARDS,
            interceptorsToken: DECODINGS_INTERCEPTORS,
            filtersToken: DECODINGS_FILTERS,
            backend: DecodingsBackend,
            ...configable,
            providers: adapter ? [
                ...configable?.providers ?? EMPTY,
                toProvider(CodingsAapter, adapter)
            ] : configable?.providers
        });

        handler.useFilters(ExecptionHandlerFilter, 0);

        return new Decodings(handler, opts)
    }
}

