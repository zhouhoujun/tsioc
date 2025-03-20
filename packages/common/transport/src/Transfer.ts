import { Abstract, Injector, InvocationContext, tokenId } from '@tsdi/ioc';
import { ConfigableHandlerOptions, createHandler, ExecptionHandlerFilter, FilterLike, ApplicationHandler, ApplicationInterceptorLike } from '@tsdi/core';
import { TransportContext } from './context';
import { Observable } from 'rxjs';



@Abstract()
export abstract class Transfer<TIn, TOut> {
    abstract transform(input: TIn, context: TransportContext): Observable<TOut>;
}

@Abstract()
export abstract class TransferFactory<TIn, TOut> {
    abstract create(context: Injector | InvocationContext, options?: TransferOpts<TIn>): Transfer<TIn, TOut>;
}

/**
 * deserializer options
 */
export interface TransferOpts<TInput = any> extends ConfigableHandlerOptions<TInput> {

}

export class HandlerTransfer<TIn, TOut> implements Transfer<TIn, TOut> {
    constructor(
        private handler: ApplicationHandler<TIn, TOut>
    ) { }

    transform(input: any, context: TransportContext): Observable<any> {
        return this.handler.handle(input, context);
    }
}

export const TRANSFER_INTERCEPTORS = tokenId<ApplicationInterceptorLike[]>('TRANSFER_INTERCEPTORS');
export const TRANSFER_FILTERS = tokenId<FilterLike[]>('TRANSFER_FILTERS');

export abstract class AbstractTransferFactory<TIn, TOut, T extends Transfer<TIn, TOut>> implements TransferFactory<TIn, TOut> {
    create(context: Injector | InvocationContext, options?: TransferOpts<TIn>): T {
        const handler = createHandler<TIn, TOut>(context, {
            enableTypeChain: true,
            filtersToken: TRANSFER_FILTERS,
            interceptorsToken: TRANSFER_INTERCEPTORS,
            ...this.vaildOptions(options)
        });
        handler.useFilters(ExecptionHandlerFilter, 0);
        return this.createInstace(handler);
    }

    protected vaildOptions(options?: TransferOpts<TIn>): TransferOpts<TIn> | undefined {
        return options
    }

    protected abstract createInstace(handler: ApplicationHandler<TIn, TOut>): T;
}