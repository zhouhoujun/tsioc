import { InvocationContext } from '@tsdi/ioc';

/**
 * execption filter.
 */
 export interface ExecptionFilter<T extends InvocationContext = InvocationContext> {
    /**
     * handle execption.
     * @param ctx invocation context.
     * @param execption execption error.
     */
    handle(ctx: T, execption: Error): any;
}
