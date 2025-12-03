import { Context, ContextToken, DefaultContext } from './handlers/Context';
import { Handler, HandlerFn, HandlerLike } from './handlers/handler';
import { Interceptor, InterceptorFn, InterceptorLike } from './handlers/interceptor';
import { Injector, InjectorRecord } from './injector';
import { Runtime } from './runtime';
import { InjectFlags, Token, token } from './tokens';
import { AbstractType, TypeOf } from './types';
import { isDefined, isObject } from './utils/chk';




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
    resolver?: TypeOf<ResolveInterceptorLike>[];
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
    return isObject(target) && (target.provider || target.type || (target.name && target.propertyKey))
}

export type ResolveHandler<TInput extends Parameter = Parameter, TOuptut = any> = Handler<TInput, TOuptut, ResolveContext>;
export type ResolveHandlerFn<TInput extends Parameter = Parameter, TOuptut = any> = HandlerFn<TInput, TOuptut, ResolveContext>;
export type ResolveHandlerLike<TInput extends Parameter = Parameter, TOuptut = any> = HandlerLike<TInput, TOuptut, ResolveContext>;

export type ResolveInterceptor<TInput extends Parameter = Parameter, TOuptut = any> = Interceptor<TInput, TOuptut, ResolveContext>;
export type ResolveInterceptorFn<TInput extends Parameter = Parameter, TOuptut = any> = InterceptorFn<TInput, TOuptut, ResolveContext>;
export type ResolveInterceptorLike<TInput extends Parameter = Parameter, TOuptut = any> = InterceptorLike<TInput, TOuptut, ResolveContext>;

/**
 * Parameter resolver
 */
export abstract class Resolver {

    /**
     * resolve parameter
     * @param parameter 
     * @param context 
     */
    abstract resolve<T>(parameter: Parameter<T>, context: ResolveContext): T;
    /**
     * resolve parameter
     * @param injector 
     * @param params 
     * @param context 
     */
    abstract resolveParams(injector: Injector, params?: Parameter[], context?: ResolveContext): any[];
    /**
     * resolver arguments
     * @param injector 
     * @param args 
     * @param context 
     */
    abstract resolveArgs(injector: Injector, args?: (ParameterLike | InjectorRecord)[], context?: ResolveContext): any[];

}

export function getResolver(injector: Injector) {
    return injector.get(Resolver, null, InjectFlags.Self) ?? injector.get(DEFAULTA_RESOLVER);
}

export const DEFAULTA_RESOLVER = token<Resolver>('DEFAULTA_RESOLVER');
const PAYLOAD = new ContextToken<any>(() => null);
const RESOLVER_FAILED = new ContextToken<(target: AbstractType, propertyKey: string) => void>(() => null!);
const RESOLVER_INJECTOR = new ContextToken<Injector>(() => null!);


export class ResolveContext extends DefaultContext {

    getPayload<T = any>(): T {
        return this.get(PAYLOAD) as T;
    }

    setPayload<T>(payload: T) {
        this.set(PAYLOAD, payload);
        return this;
    }

    getRuntime(): Runtime {
        return this.get(Runtime);
    }


    getInjector(): Injector {
        return this.get(RESOLVER_INJECTOR);
    }

    setInjector(injector: Injector): this {
        return this.set(RESOLVER_INJECTOR, injector)
    }

    getFailed(): (target: AbstractType, propertyKey: string) => void {
        return this.get(RESOLVER_FAILED);
    }
}



export function createResolveContext(injector: Injector, payload?: any, previous?: Context, failed?: (target: AbstractType, propertyKey: string) => void) {
    const context = new ResolveContext(previous);
    context.set(RESOLVER_INJECTOR, injector);
    if (isDefined(payload)) context.setPayload(payload);
    if (isDefined(failed)) context.set(RESOLVER_FAILED, failed);
    return context;
}



