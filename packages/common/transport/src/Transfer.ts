import { Abstract, Injector, InvocationContext, tokenId } from '@tsdi/ioc';
import { ConfigableHandlerOptions, createHandler, ExceptionHandlerFilter, FilterLike, InterceptorLike } from '@tsdi/core';
import { RequestHandler } from '@tsdi/common';
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
        private handler: RequestHandler<TIn, TOut>
    ) { }

    transform(input: any, context: TransportContext): Observable<any> {
        return this.handler.handle(input, context);
    }
}

export const TRANSFER_INTERCEPTORS = tokenId<InterceptorLike[]>('TRANSFER_INTERCEPTORS');
export const TRANSFER_FILTERS = tokenId<FilterLike[]>('TRANSFER_FILTERS');

export abstract class AbstractTransferFactory<TIn, TOut, T extends Transfer<TIn, TOut>> implements TransferFactory<TIn, TOut> {
    create(context: Injector | InvocationContext, options?: TransferOpts<TIn>): T {
        const handler = createHandler<TIn, TOut>(context, {
            enableTypeChain: true,
            filtersToken: TRANSFER_FILTERS,
            interceptorsToken: TRANSFER_INTERCEPTORS,
            filters:[
                ExceptionHandlerFilter
            ],
            ...this.vaildOptions(options)
        });
        return this.createInstace(handler);
    }

    protected vaildOptions(options?: TransferOpts<TIn>): TransferOpts<TIn> | undefined {
        return options
    }

    protected abstract createInstace(handler: RequestHandler<TIn, TOut>): T;
}