import { OperationArgumentResolver, Parameter, Invocation, TypeOf, Token, getTokenOf, isToken, getTypeName } from '@tsdi/ioc';
import { PipeTransform } from '../pipes/pipe';
import { HandleContext } from './context';

/**
 * transport parameter options.
 */
export interface TransportParameterOptions<T = object> extends Parameter<T> {
    /**
     * field of request query params or body.
     */
    field?: string;
    /**
     * pipe
     */
    pipe?: string | TypeOf<PipeTransform>;
    /**
     * custom resolver to resolve the value for the property or parameter.
     */
    resolver?: TypeOf<OperationArgumentResolver>;
    /**
     * pipe extends args
     */
    args?: any[];
}

export type ParameterScope = 'headers' | 'query' | 'path' | 'payload' | 'body' | 'topic';
/**
 * transport parameter argument of an {@link TransportArgumentResolver}.
 */
export interface TransportParameter<T = object> extends TransportParameterOptions<T>, Parameter<T> {
    /**
     * field scope.
     */
    scope?: ParameterScope;
}

/**
 * Resolver for an transport argument of an {@link Invocation}.
 */
export interface TransportArgumentResolver extends OperationArgumentResolver<TransportParameter, HandleContext> {
    /**
     * Return whether an argument of the given {@code parameter} can be resolved.
     * @param parameter argument type
     * @param ctx instanceof HandleContext
     */
    canResolve(parameter: TransportParameter, ctx: HandleContext): boolean;
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param ctx instanceof HandleContext
     */
    resolve<T>(parameter: TransportParameter, ctx: HandleContext): T | null;
}


/**
 * get transport argument resolvers token.
 * @param type 
 * @returns 
 */
export function getResolverToken(type: TypeOf<any>, propertyKey?: string): Token<TransportArgumentResolver[]> {
    return getTokenOf(type, 'RESOLVERS', propertyKey);
}

/**
 * get pipe of transport parameter.
 * @param parameter 
 * @param ctx 
 * @returns 
 */
export function getPipe<T>(parameter: TransportParameter<T>, ctx: HandleContext, isPrimitive?: boolean): PipeTransform | null {
    if (parameter.pipe) {
        if (isToken(parameter.pipe)) return ctx.get<PipeTransform>(parameter.pipe);
        return parameter.pipe;
    }
    return parameter.type ? ctx.get<PipeTransform>(isPrimitive ? parameter.type.name.toLowerCase() : getTypeName(parameter.type)) : null;
}
