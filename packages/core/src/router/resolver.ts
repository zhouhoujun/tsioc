import { OperationArgumentResolver, Parameter, Type, OperationInvoker } from '@tsdi/ioc';
import { PipeTransform } from '../pipes/pipe';
import { EndpointContext } from '../filters/context';

/**
 * transport parameter argument of an {@link TransportArgumentResolver}.
 */
export interface TransportParameter<T = any> extends Parameter<T> {
    /**
     * field scope.
     */
    scope?: 'body' | 'query' | 'restful';
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
 * Resolver for an transport argument of an {@link OperationInvoker}.
 */
export interface TransportArgumentResolver<T = any> extends OperationArgumentResolver<T> {
    /**
     * Return whether an argument of the given {@code parameter} can be resolved.
     * @param parameter argument type
     * @param ctx InvocationContext
     */
    canResolve(parameter: TransportParameter, ctx: EndpointContext): boolean;
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param ctx InvocationContext
     */
    resolve<T>(parameter: TransportParameter<T>, ctx: EndpointContext): T;
}
