import { Context, ContextToken } from '../handler';
import { Injector } from '../injector';
import { DecoratorFn } from '../metadata/class';
import { Parameters, Parameter } from '../resolver';
import { Runtime } from '../runtime';
import { InjectFlags, Token } from '../tokens';
import { isUndefined } from '../utils/chk';

const CURR_DECOR = new ContextToken<DecoratorFn>(() => null!);
const INJECTOR = new ContextToken<Injector>(() => null!);
const RAISE_INJECTOR = new ContextToken<Injector>(() => null!);
const PROVIDE = new ContextToken<Token | null>(() => null);
const CTOR_ARGS = new ContextToken<any[] | null>(() => null);
const CTOR_PARAMS = new ContextToken<Array<Token | [Token, ...InjectFlags[]] | Parameter> | null>(() => null);

const IS_RESOLVE = new ContextToken<boolean>(() => false);

const INSTANCE = new ContextToken<any>(() => null!);

const MUTIL = new ContextToken<boolean>(() => false);


export namespace Design {

    export function mutil(context: Context): boolean
    export function mutil(context: Context, value: boolean): void
    export function mutil(context: Context, value?: boolean): void | boolean {
        if (isUndefined(value)) return context.get(MUTIL);
        context.set(MUTIL, value);
    }

    export function runtime(context: Context): Runtime
    export function runtime(context: Context, value: Runtime): void
    export function runtime(context: Context, value?: Runtime): void | Runtime {
        if (isUndefined(value)) return context.get(Runtime);
        context.set(Runtime, value);
    }


    export function currDecor(context: Context): DecoratorFn
    export function currDecor(context: Context, value: DecoratorFn): void
    export function currDecor(context: Context, value?: DecoratorFn): void | DecoratorFn {
        if (isUndefined(value)) return context.get(CURR_DECOR);
        context.set(CURR_DECOR, value);
    }

    export function instance<T>(context: Context): T
    export function instance<T>(context: Context, value: T): void
    export function instance(context: Context, value?: any): void | any {
        if (isUndefined(value)) return context.get(INSTANCE);
        context.set(INSTANCE, value);
    }


    export function isResolve(context: Context): boolean
    export function isResolve(context: Context, value: boolean): void
    export function isResolve(context: Context, value?: boolean): void | boolean {
        if (isUndefined(value)) return context.get(IS_RESOLVE);
        context.set(IS_RESOLVE, value);
    }


    export function provide(context: Context): Token | null
    export function provide(context: Context, value: Token | null): void
    export function provide(context: Context, value?: Token | null): void | Token | null {
        if (isUndefined(value)) return context.get(PROVIDE);
        context.set(PROVIDE, value);
    }


    export function injector(context: Context): Injector
    export function injector(context: Context, value: Injector): void
    export function injector(context: Context, value?: Injector): void | Injector {
        if (isUndefined(value)) return context.get(INJECTOR);
        context.set(INJECTOR, value);
    }


    export function ctorArgs(context: Context): any[] | null;
    export function ctorArgs(context: Context, value: any[] | null): void
    export function ctorArgs(context: Context, value?: any[] | null): void | any[] | null {
        if (isUndefined(value)) return context.get(CTOR_ARGS);
        context.set(CTOR_ARGS, value);
    }

    export function ctorParams(context: Context): Parameters;
    export function ctorParams(context: Context, value: Parameters): void
    export function ctorParams(context: Context, value?: Parameters): void | Parameters {
        if (isUndefined(value)) return context.get(CTOR_PARAMS);
        context.set(CTOR_PARAMS, value);
    }

    export function raiseInjector(context: Context): Injector
    export function raiseInjector(context: Context, value: Injector): void
    export function raiseInjector(context: Context, value?: Injector): void | Injector {
        if (isUndefined(value)) return context.get(RAISE_INJECTOR);
        context.set(RAISE_INJECTOR, value);
    }

    export function getInjector(context: Context): Injector {
        return context.get(RAISE_INJECTOR) ?? context.get(INJECTOR)
    }
}



export class IocContext extends Context {

    constructor(runtime: Runtime, entries?: readonly (readonly [Token | ContextToken, any])[] | null) {
        super(entries)
        this.set(Runtime, runtime);
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

export class RuntimeContext extends IocContext {

    get raiseInjector(): Injector {
        return this.get(RAISE_INJECTOR);
    }

    set raiseInjector(value: Injector) {
        this.set(RAISE_INJECTOR, value);
    }
}