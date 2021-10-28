import { OperationArgumentResolver, Parameter, Type } from '@tsdi/ioc';
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
export interface TrasportArgumentResolver extends OperationArgumentResolver {
    /**
     * Return whether an argument of the given {@code parameter} can be resolved.
     * @param parameter argument type
     * @param args gave arguments
     */
    canResolve(parameter: TrasportParameter, args: Record<string, any>): boolean;
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param args gave arguments
     */
    resolve<T>(parameter: TrasportParameter<T>, args: Record<string, any>): T;
}
