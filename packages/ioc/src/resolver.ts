import { ArgumentException } from './exception';
import { Context, ContextToken, InterceptorLike } from './handler';
import { Injector } from './injector';
import { Abstract } from './metadata/fac';
import { Runtime } from './runtime';
import { InjectFlags, Token } from './tokens';
import { AbstractType, TypeOf } from './types';
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

export type ResolveInterceptorLike<TInput extends Parameter = Parameter, TOuptut = any> = InterceptorLike<TInput, TOuptut, ResolveContext>;

@Abstract()
export abstract class Resolver {

    abstract resolve<T>(parameter: Parameter<T>, context: ResolveContext): T;
}



const RAISE_INJECTOR = new ContextToken<Injector>(() => null!);
const TARGET = new ContextToken<AbstractType | null>(() => null);

export class ResolveContext extends Context {

    constructor(
        injector: Injector,
        readonly target?: AbstractType,
        readonly failed?: (target: AbstractType, propertyKey: string) => void) {
        super();
        this.setInjector(injector);
        this.set(Runtime, injector.getRuntime());
        if (target) this.set(TARGET, target);

    }

    getTarget() {
        return this.get(TARGET);
    }

    getRuntime(): Runtime {
        return this.get(Runtime);
    }

    getRaiseInjector(): Injector {
        return this.get(RAISE_INJECTOR);
    }

    setRaiseInjector(value: Injector) {
        this.set(RAISE_INJECTOR, value);
    }

    getInjector(): Injector {
        return this.get(Injector);
    }

    setInjector(value: Injector) {
        this.set(Injector, value);
    }
}

export function createResolveContext(injector: Injector, target?: AbstractType, failed = onError) {
    return new ResolveContext(injector, target, onError);
}

const onError = (target: AbstractType, propertyKey: string): void => {
    throw new ArgumentException(`can not autowride property ${propertyKey} of class ${target}`)
}
