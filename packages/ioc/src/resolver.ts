import { RunContext } from './handlers/contexts';
import { Handler, HandlerFn, HandlerLike } from './handlers/handler';
import { Interceptor, InterceptorFn, InterceptorLike } from './handlers/interceptor';
import { Injector, InjectorRecord } from './injector';
import { InjectFlags, Token, token, TokenOf } from './tokens';
import { AbstractType } from './types';
import { isObject } from './utils/chk';




/**
 * parameter argument of an {@link OperationArgumentResolver}.
 * 
 * 调用参数。
 */
export interface Parameter<T = any> {
    /**
     * param name
     */
    name?: string;
    /**
     * param design type.
     */
    type?: AbstractType<T>;

    /**
     * the parameter of target type.
     */
    target: AbstractType<T>;
    /**
     * method property key
     *
     * @type {string}
     */
    propertyKey: string;
    /**
     * this type provide from.
     *
     * @type {Token}
     * @memberof Provide
     */
    provider?: Token<T>;

    /**
     * is multi provider or not
     */
    multi?: boolean;

    /**
     * inject flags.
     */
    flags?: InjectFlags
    /**
     * custom resolver to resolve property or parameter.
     */
    resolver?: TokenOf<ResolveInterceptorLike>[];
    /**
     * null able or not.
     */
    nullable?: boolean;
    /**
     * default value
     *
     * @type {any}
     */
    defaultValue?: any;

}


export type ParameterLike = Token | [Token, ...InjectFlags[]] | Parameter;

export type Parameters = ParameterLike[] | null;

export function isParameter(target: any): target is Parameter {
    return target != null && typeof target === 'object' && (target.provider || target.type || (target.name && target.propertyKey));
}

export type ResolveHandler<TInput extends Parameter = Parameter, TOuptut = any> = Handler<TInput, TOuptut, RunContext>;
export type ResolveHandlerFn<TInput extends Parameter = Parameter, TOuptut = any> = HandlerFn<TInput, TOuptut, RunContext>;
export type ResolveHandlerLike<TInput extends Parameter = Parameter, TOuptut = any> = HandlerLike<TInput, TOuptut, RunContext>;

export type ResolveInterceptor<TInput extends Parameter = Parameter, TOuptut = any> = Interceptor<TInput, TOuptut, RunContext>;
export type ResolveInterceptorFn<TInput extends Parameter = Parameter, TOuptut = any> = InterceptorFn<TInput, TOuptut, RunContext>;
export type ResolveInterceptorLike<TInput extends Parameter = Parameter, TOuptut = any> = InterceptorLike<TInput, TOuptut, RunContext>;

/**
 * Parameter resolver
 */
export abstract class Resolver {

    /**
     * resolve parameter
     * @param parameter 
     * @param context 
     */
    abstract resolve<T>(parameter: Parameter<T>, context: RunContext): T;
    /**
     * resolve parameter
     * @param injector 
     * @param params 
     * @param context 
     */
    abstract resolveParams(injector: Injector, params?: Parameter[], context?: RunContext): any[];
    // /**
    //  * resolver arguments
    //  * @param injector 
    //  * @param args 
    //  * @param context 
    //  */
    // abstract resolveArgs(injector: Injector, args?: (ParameterLike | InjectorRecord)[], context?: RunContext): any[];

}

export function getResolver(injector: Injector) {
    return injector.get(Resolver, null, InjectFlags.Self) ?? injector.get(DEFAULTA_RESOLVER);
}

export const DEFAULTA_RESOLVER = token<Resolver>('DEFAULTA_RESOLVER');
