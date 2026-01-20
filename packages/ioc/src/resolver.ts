import { Context, ContextToken, DefaultContext } from './handlers/Context';
import { Handler, HandlerFn, HandlerLike } from './handlers/handler';
import { Interceptor, InterceptorFn, InterceptorLike } from './handlers/interceptor';
import { Injector, InjectorRecord } from './injector';
import { Runtime } from './runtime';
import { InjectFlags, Token, token, TokenOf } from './tokens';
import { AbstractType } from './types';
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
    return isObject(target) && (target.provider || target.type || (target.name && target.propertyKey))
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
    /**
     * resolver arguments
     * @param injector 
     * @param args 
     * @param context 
     */
    abstract resolveArgs(injector: Injector, args?: (ParameterLike | InjectorRecord)[], context?: RunContext): any[];

}

export function getResolver(injector: Injector) {
    return injector.get(Resolver, null, InjectFlags.Self) ?? injector.get(DEFAULTA_RESOLVER);
}

export const DEFAULTA_RESOLVER = token<Resolver>('DEFAULTA_RESOLVER');
const PAYLOAD = new ContextToken<any>(() => null);
const RUN_FAILED = new ContextToken<(target: AbstractType, propertyKey: string) => void>(() => null!);
// const RESOLVER_INJECTOR = new ContextToken<Injector>(() => null!);


// export class RunContext extends DefaultContext {

//     getPayload<T = any>(): T {
//         return this.get(PAYLOAD) as T;
//     }

//     setPayload<T>(payload: T) {
//         this.set(PAYLOAD, payload);
//         return this;
//     }

//     getRuntime(): Runtime {
//         return this.get(Runtime);
//     }


//     getInjector(): Injector {
//         return this.get(RESOLVER_INJECTOR);
//     }

//     setInjector(injector: Injector): this {
//         return this.set(RESOLVER_INJECTOR, injector)
//     }

//     getFailed(): (target: AbstractType, propertyKey: string) => void {
//         return this.get(RESOLVER_FAILED);
//     }
// }



// export function createRunContext(injector: Injector, payload?: any, previous?: Context, failed?: (target: AbstractType, propertyKey: string) => void) {
//     const context = new RunContext(previous);
//     context.set(RESOLVER_INJECTOR, injector);
//     if (isDefined(payload)) context.setPayload(payload);
//     if (isDefined(failed)) context.set(RESOLVER_FAILED, failed);
//     return context;
// }




export class RunContext extends DefaultContext {

    constructor(contextOrEntries?: Context | Iterable<readonly [Token | ContextToken, any]>, entries?: Iterable<readonly [Token | ContextToken, any]>) {
        super(contextOrEntries, entries);
    }

    // override has<T>(token: Token<T> | ContextToken<T>): boolean {
    //     if (token instanceof ContextToken) return this.map.has(token);
    //     return this.map.has(token) || this.getInjector().has(token);
    // }

    getInjector() {
        return this.get(Injector)
    }

    setInjector(injector: Injector): this {
        return this.set(Injector, injector)
    }

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

    protected override getToken<T>(token: Token<T>) {
        return this.map.get(token) ?? this.getFromInjector(token)
    }

    protected getFromInjector<T>(token: Token<T>) {
        const value = this.getInjector().get(token);
        this.set(token, value);
        return value;
    }

    getFailed(): (target: AbstractType, propertyKey: string) => void {
        return this.get(RUN_FAILED);
    }


}


export function createRunContext(injector: Injector, entries?: Iterable<readonly [Token | ContextToken, any]>): RunContext;
export function createRunContext(injector: Injector, previous?: Context, entries?: Iterable<readonly [Token | ContextToken, any]>): RunContext;
export function createRunContext(injector: Injector, previous?: Context | Iterable<readonly [Token | ContextToken, any]>, entries?: Iterable<readonly [Token | ContextToken, any]>) {
    const context = new RunContext(previous ?? entries, entries);
    context.setInjector(injector);
    return context;
}

