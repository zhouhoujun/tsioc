import { RunContext } from './handlers/contexts';
import { Handler, HandlerFn, HandlerLike } from './handlers/handler';
import { Interceptor, InterceptorFn, InterceptorLike } from './handlers/interceptor';
import { Injector } from './injector';
import { InjectFlags, Token, TokenOf } from './tokens';
import { AbstractType } from './types';
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
    flags?: InjectFlags;
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
export declare function isParameter(target: any): target is Parameter;
export type ResolveHandler<TInput extends Parameter = Parameter, TOuptut = any> = Handler<TInput, TOuptut, RunContext>;
export type ResolveHandlerFn<TInput extends Parameter = Parameter, TOuptut = any> = HandlerFn<TInput, TOuptut, RunContext>;
export type ResolveHandlerLike<TInput extends Parameter = Parameter, TOuptut = any> = HandlerLike<TInput, TOuptut, RunContext>;
export type ResolveInterceptor<TInput extends Parameter = Parameter, TOuptut = any> = Interceptor<TInput, TOuptut, RunContext>;
export type ResolveInterceptorFn<TInput extends Parameter = Parameter, TOuptut = any> = InterceptorFn<TInput, TOuptut, RunContext>;
export type ResolveInterceptorLike<TInput extends Parameter = Parameter, TOuptut = any> = InterceptorLike<TInput, TOuptut, RunContext>;
/**
 * Parameter resolver
 */
export declare abstract class Resolver {
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
}
export declare function getResolver(injector: Injector): Resolver;
export declare const DEFAULTA_RESOLVER: import("./tokens").InjectToken<Resolver>;
