import { Abstract, Injector, InvocationContext, Token } from '@tsdi/ioc';
import { Backend, BackendFn, ConfigableHandlerOptions, createHandler, ExecptionHandlerFilter, Handler } from '@tsdi/core';
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
    backend?: Token<Backend<TInput>> | Backend<TInput> | BackendFn<TInput>;
}

export class HandlerTransfer<TIn, TOut> implements Transfer<TIn, TOut> {
    constructor(
        private handler: Handler<TIn, TOut>
    ) { }

    transform(input: any, context: TransportContext): Observable<any> {
        return this.handler.handle(input, context);
    }
}

export abstract class AbstractTransferFactory<TIn, TOut, T extends Transfer<TIn, TOut>> implements TransferFactory<TIn, TOut> {
    create(context: Injector | InvocationContext, options?: TransferOpts<TIn>): T {
        const handler = createHandler<TIn, TOut>(context, this.vaildOptions(options));
        handler.useFilters(ExecptionHandlerFilter, 0);
        return this.createInstace(handler);
    }

    protected vaildOptions(options?: TransferOpts<TIn>): TransferOpts<TIn> {
        return {
            enableTypeChain: true,
            ...options
        }
    }

    protected abstract createInstace(handler: Handler<TIn, TOut>): T;
}