import { InvocationContext, OperationArgumentResolver, Parameter, Type } from '@tsdi/ioc';
import { Context } from './context';
import { PipeTransform } from '../pipes/pipe';

/**
 * trasport parameter argument of an {@link TrasportArgumentResolver}.
 */
export interface TrasportParameter<T = any> extends Parameter<T> {
    /**
     * field scope.
     */
    scope?: 'body' | 'query' | 'restful'
    /**
     * field of request query params or body.
     */
    field?: string;
    /**
     * pipe
     */
    pipe?: string | Type<PipeTransform>;
    /**
     * pipe extends args
     */
    args?: any[];
}

/**
 * Resolver for an trasport argument of an {@link OperationInvoker}
 */
export interface TrasportArgumentResolver<C extends Context = Context> extends OperationArgumentResolver<C> {
    /**
     * Return whether an argument of the given {@code parameter} can be resolved.
     * @param parameter argument type
     * @param ctx InvocationContext
     */
    canResolve(parameter: TrasportParameter, ctx: InvocationContext<C>): boolean;
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param ctx InvocationContext
     */
    resolve<T>(parameter: TrasportParameter<T>, ctx: InvocationContext<C>): T;
}
