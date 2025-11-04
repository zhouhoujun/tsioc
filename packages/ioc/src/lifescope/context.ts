import { Context, ContextToken } from '../handler';
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


export class IocContext extends Context {

    constructor(runtime: Runtime, entries?: readonly (readonly [Token | ContextToken, any])[] | null) {
        super(entries)
        this.set(Runtime, runtime);
    }

    get runtime(): Runtime {
        return this.get(Runtime);
    }

    set runtime(value: Runtime) {
        this.set(Runtime, value);
    }

    get currDecor(): DecoratorFn | null {
        return this.get(CURR_DECOR);
    }

    set currDecor(value: DecoratorFn | null) {
        this.set(CURR_DECOR, value);
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

    /**
     * the token to provide.
     */
    get provide(): Token | null {
        return this.get(PROVIDE);
    }

    set provide(value: Token | null) {
        this.set(PROVIDE, value);
    }

    get injector(): Injector {
        return this.get(INJECTOR);
    }

    set injector(value: Injector) {
        this.set(INJECTOR, value);
    }

    get raiseInjector(): Injector {
        return this.get(RAISE_INJECTOR);
    }

    set raiseInjector(value: Injector) {
        this.set(RAISE_INJECTOR, value);
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

    /**
     * constructor parameters.
     */
    get params(): Parameters {
        return this.get(CTOR_PARAMS);
    }

    set params(value: Parameters) {
        this.set(CTOR_PARAMS, value);
    }

}
