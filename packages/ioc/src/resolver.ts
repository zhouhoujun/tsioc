import { ArgumentException } from './exception';
import { Context, ContextToken, Interceptor, InterceptorLike } from './handler';
import { Injector, InjectorRecord } from './injector';
import { Runtime } from './runtime';
import { InjectFlags, Token, tokenId } from './tokens';
import { AbstractType, TypeOf } from './types';
import { isObject } from './utils/chk';
import { getTypeName } from './utils/lang';



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

export type ResolveInterceptor<TInput extends Parameter = Parameter, TOuptut = any> = Interceptor<TInput, TOuptut, ResolveContext>;
export type ResolveInterceptorLike<TInput extends Parameter = Parameter, TOuptut = any> = InterceptorLike<TInput, TOuptut, ResolveContext>;

export abstract class Resolver {

    /**
     * resolve parameter
     * @param parameter 
     * @param context 
     */
    abstract resolve<T>(parameter: Parameter<T>, context: ResolveContext): T;
    /**
     * resolve parameters
     * @param injector 
     * @param params 
     * @param target 
     */
    abstract resolveParams(injector: Injector, params?: Parameter[], target?: AbstractType): any[];
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
     * @param target 
     */
    abstract resolveArgs(injector: Injector, args?: (ParameterLike | InjectorRecord)[], target?: AbstractType): any[];
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

export const DEFAULTA_RESOLVER = tokenId<Resolver>('DEFAULTA_RESOLVER');
const TARGET = new ContextToken<AbstractType | null>(() => null);
const PAYLOAD = new ContextToken<any>(() => null);

export class ResolveContext extends Context {

    constructor(
        injector: Injector,
        target?: AbstractType,
        readonly failed?: (target: AbstractType, propertyKey: string) => void) {
        super();
        this.setInjector(injector);
        this.set(Runtime, injector.getRuntime());
        if (target) this.set(TARGET, target);

    }

    getTarget() {
        return this.get(TARGET);
    }


    getPayload<T>(): T {
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
        return this.get(Injector);
    }

    setInjector(value: Injector) {
        this.set(Injector, value);
        return this;
    }
}

export function createResolveContext(injector: Injector, target?: AbstractType, failed?: (target: AbstractType, propertyKey: string) => void) {
    return new ResolveContext(injector, target, failed);
}

// const onError = (target: AbstractType, propertyKey: string): void => {
//     throw new ArgumentException(`can not autowride property ${propertyKey} of class ${getTypeName(target)}`)
// }

