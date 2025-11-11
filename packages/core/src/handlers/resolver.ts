import { ResolveInterceptorLike, Parameter, TypeOf, Token, getTokenOf } from '@tsdi/ioc';
import { PipeTransform } from '../pipes/pipe';


export type ParameterScope = 'headers' | 'query' | 'path' | 'payload' | 'body' | 'topic';
/**
 * transport parameter argument.
 */
export interface TransportParameter<T = object> extends Parameter<T> {

    /**
     * field of request query params or body.
     */
    field?: string;
    /**
     * pipe
     */
    pipe?: string | TypeOf<PipeTransform>;
    /**
     * pipe extends args
     */
    args?: any[];
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
 * get transport argument resolve handler token.
 * @param type 
 * @returns 
 */
export function getResolveHandlerToken(type: TypeOf<any>, propertyKey?: string): Token<ResolveInterceptorLike[]> {
    return getTokenOf(type, 'RESOLVE_HANDLERS', propertyKey);
}
