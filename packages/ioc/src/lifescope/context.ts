import { Context, ContextAdapter, ContextToken } from '../handler';
import { Injector } from '../injector';
import { DecoratorFn } from '../metadata/class';
import { Parameters, Parameter } from '../resolver';
import { Runtime } from '../runtime';
import { InjectFlags, Token } from '../tokens';

const CURR_DECOR = new ContextToken<DecoratorFn>(() => null!);
const INJECTOR = new ContextToken<Injector>(() => null!);
const RAISE_INJECTOR = new ContextToken<Injector>(() => null!);
const PROVIDE = new ContextToken<Token | null>(() => null);
const CTOR_ARGS = new ContextToken<any[] | null>(() => null);
const CTOR_PARAMS = new ContextToken<Array<Token | [Token, ...InjectFlags[]] | Parameter> | null>(() => null);

const IS_RESOLVE = new ContextToken<boolean>(() => false);

const INSTANCE = new ContextToken<any>(() => null!);

const MUTIL = new ContextToken<boolean>(() => false);





export class IocContext extends ContextAdapter {

    get runtime(): Runtime {
        return this.get(Runtime);
    }

    set runtime(value: Runtime) {
        this.set(Runtime, value);
    }

    get injector(): Injector {
        return this.get(INJECTOR);
    }

    set injector(value: Injector) {
        this.set(INJECTOR, value);
    }


    /**
     * the token to provide.
     */
    get provide(): Token | null {
        return this.get(PROVIDE);
    }

    set provide(value: Token | null) {
        this.set(PROVIDE, value);
    }

    /**
     * whether the context is mutil.
     */
    get isMutil(): boolean {
        return this.get(MUTIL);
    }

    set isMutil(value: boolean) {
        this.set(MUTIL, value);
    }

    get currDecor(): DecoratorFn | null {
        return this.get(CURR_DECOR);
    }

    set currDecor(value: DecoratorFn | null) {
        this.set(CURR_DECOR, value);
    }

}


export class RuntimeContext extends IocContext {
    /**
     * constructor parameters.
     */
    get params(): Parameters {
        return this.get(CTOR_PARAMS);
    }

    set params(value: Parameters) {
        this.set(CTOR_PARAMS, value);
    }

    /**
     * constructor arguments.
     */
    get args(): any[] | null {
        return this.get(CTOR_ARGS);
    }

    set args(value: any[] | null) {
        this.set(CTOR_ARGS, value);
    }

    get raiseInjector(): Injector {
        return this.get(RAISE_INJECTOR);
    }

    set raiseInjector(value: Injector) {
        this.set(RAISE_INJECTOR, value);
    }


    get instance(): any {
        return this.get(INSTANCE);
    }

    set instance(value: any) {
        this.set(INSTANCE, value);
    }

    /**
     * whether the context is resolve.
     */
    get isResolve(): boolean {
        return this.get(IS_RESOLVE);
    }

    set isResolve(value: boolean) {
        this.set(IS_RESOLVE, value);
    }
}


export function createContext(injector: Injector, previous?: Context, runtime?: Runtime, multi?: boolean, provide?: Token | null) {
    const context = new IocContext(previous);
    context.set(INJECTOR, injector);
    if (!context.has(Runtime)) context.set(Runtime, runtime ?? injector.getRuntime());
    if (multi) context.set(MUTIL, true);
    if (!multi && provide) {
        context.set(PROVIDE, provide);
    }
    return context;
}

export function createRuntimeContext(injector: Injector, previous?: Context, runtime?: Runtime, raise?: Injector, multi?: boolean, params?: Parameters) {
    const context = new RuntimeContext(previous);
    context.set(INJECTOR, injector);
    if (!context.has(Runtime)) context.set(Runtime, runtime ?? injector.getRuntime());

    context.set(RAISE_INJECTOR, raise || injector);
    if (multi) context.set(MUTIL, true);
    if (params) {
        context.set(CTOR_PARAMS, params);
    }
    return context;
}