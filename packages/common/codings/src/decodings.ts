import { Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Backend, CanActivate, ConfigableHandler, ExecptionHandlerFilter, Interceptor, createHandler } from '@tsdi/core';
import { Observable } from 'rxjs';
import { CodingsOpts, DecodingsOptions } from './options';
import { CodingsContext } from './context';
import { Decoder } from './Decoder';
import { Codings } from './Codings';


/**
 * Decodings Handler
 */
export class DecodingsHandler<TInput = any, TOutput = any> extends ConfigableHandler<TInput, TOutput, DecodingsOptions, CodingsContext> {

    private _backend?: DecodingsBackend;
    protected override getBackend(): DecodingsBackend {
        if (!this._backend) {
            this._backend = super.getBackend() as DecodingsBackend;
        }
        return this._backend
    }


}

/**
 * Decodings Backend
 */
@Injectable()
export class DecodingsBackend<TInput = any, TOutput = any> implements Backend<TInput, TOutput, CodingsContext> {
    
    constructor(protected codings: Codings) { }

    handle(input: TInput, context: CodingsContext): Observable<TOutput> {
        context.options.decodings?.end
        return this.codings.deepDecode(input, context);
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
            ...options.decodings,
            classType: DecodingsHandler
        });

        handler.useFilters(ExecptionHandlerFilter);

        return new Decodings(handler)
    }
}

