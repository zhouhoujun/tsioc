import { ResolveInterceptorLike, Parameter, TypeOf, Token, ResolveHandler, ResolveInterceptorFn, TokenOf } from '@tsdi/ioc';
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
    pipe?: string | TokenOf<PipeTransform>;
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
    resolver?: TokenOf<ResolveInterceptorLike<TransportParameter>>[];
}
/**
 * get transport argument resolve handler token.
 * @param type
 * @returns
 */
export declare function getResolveHandlerToken(type: TypeOf<any>, propertyKey?: string): Token<ResolveHandler>;
export declare const typeResolveInterceptor: ResolveInterceptorFn;
