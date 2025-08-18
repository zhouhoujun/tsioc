import { ResolveInterceptorLike, Parameter, TypeOf, Token, getTokenOf } from '@tsdi/ioc';
import { PipeTransform } from '../pipes/pipe';

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
    resolver?: TypeOf<ResolveInterceptorLike<TransportParameter>>[];
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
    
    /**
     * custom resolver to resolve the value for the property or parameter.
     */
    resolver?: TypeOf<ResolveInterceptorLike<TransportParameter>>[];
}



/**
 * get transport argument resolvers token.
 * @param type 
 * @returns 
 */
export function getResolverToken(type: TypeOf<any>, propertyKey?: string): Token<ResolveInterceptorLike[]> {
    return getTokenOf(type, 'RESOLVERS', propertyKey);
}
