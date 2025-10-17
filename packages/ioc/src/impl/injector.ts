/* eslint-disable no-case-declarations */
import { AbstractType, Type, noPointcut } from '../types';
import { DestroyCallback } from '../destroy';
import { InjectFlags, Token } from '../tokens';
import { defer, getTypeName, immediate } from '../utils/lang';
import { hasProps, isAbstractType, isArray, isDefined, isFunction, isNumber, isString, isType } from '../utils/chk';
import { MethodType, InjectorScope, RegisterOption, FactoryRecord, Injector, INJECT_IMPL, InjectOperator, Parameter, ResolveInterceptorLike, InjectorOptions, createInjector } from '../injector';
import { Exception } from '../exception';
import { Runtime } from '../runtime';
import { ClassRef } from '../metadata/class';
import { CONTAINER, INJECTOR, ROOT_INJECTOR } from '../metadata/tk';
import { Provider, ModuleType } from '../providers';
import { DefaultRuntime } from './runtime';
import { DefaultInvocationFactory } from './invocation';
import { InvocationFactory } from '../invocation';
import { processInject, THROW_FLAGE, tryResolveToken } from './resolve';
import { nonEnumerable } from '../metadata/decor';
import { Operator } from './operator';
import { ContextToken, HandlerLike, InterceptorLike } from '../handler';
import { HandlerScope } from '../lifescope/lifescope';
import { isPlainObject, isTypeObject } from '../utils/obj';
import { getDef } from '../metadata/refl';


export const SCOPE_PRODIDERS: Provider[] = [];


/**
 * Default Injector
 */
export class DefaultInjector extends Injector {
    /**
     * none poincut for aop.
     * 
     * 该类是否支持AOP注入
     */
    static [noPointcut] = true;

    private _destroyed = false;

    @nonEnumerable
    protected _dsryCbs = new Set<DestroyCallback>();

    @nonEnumerable
    protected _runtime: Runtime | null = null;

    @nonEnumerable
    protected _operator: InjectOperator | null = null;

    protected isStatic?: boolean;

    protected _readyDefer = defer<void>();
    /**
     * factories.
     *
     * @protected
     * @type {Map<Token, Function>}
     */
    @nonEnumerable
    protected records: Map<Token, FactoryRecord>;
    private isAlias?: null | ((token: Token) => boolean);

    @nonEnumerable
    private _parent: Injector | null;

    readonly scope?: InjectorScope;

    constructor(private options?: InjectorOptions, parent?: Injector) {
        super()
        this.records = new Map();
        if (parent) {
            this.isResolve = options?.isResolve == true
            this._parent = parent;
            this.scope = options?.scope;
            this.initParent(parent);
        } else {
            this._parent = null;
            this.scope = 'platform';
        }
        this.initScope(this.scope);
        options && this.initOptions(options);
    }


    protected initScope(scope?: InjectorScope) {
        const val = { value: this };
        switch (scope) {
            case 'platform':
                platformAlias.forEach(tk => this.records.set(tk, val));
                this.isAlias = isPlatformAlias;
                this._runtime = new DefaultRuntime(this);
                registerCores(this, this._runtime);
                break;
            case 'root':
                this._runtime = this._parent!.getRuntime();
                this._runtime.register(this);
                this._runtime.setInjector(scope, this);
                rootAlias.forEach(tk => this.records.set(tk, val));
                this.isAlias = isRootAlias;
                break;
            case 'static':
                this._runtime = this._parent!.getRuntime();
                this._runtime.register(this);
                break;
            default:
                this._runtime = this._parent!.getRuntime();
                this._runtime.register(this);
                if (scope) {
                    this._runtime.setInjector(scope, this);
                    SCOPE_PRODIDERS.length && Operator.inject(this, SCOPE_PRODIDERS);
                }
                injectAlias.forEach(tk => this.records.set(tk, val));
                this.isAlias = this.isStatic ? isStaticAlias : isInjectAlias;
                break;
        }
    }

    protected initOptions(options: InjectorOptions) {
        if (options.providers) {
            const result = processInject(this, options.providers);
            if (result) {
                result.then(() => this._readyDefer.resolve())
            } else {
                this._readyDefer.resolve();
            }
        }
    }

    protected initParent(parent: Injector) {
        parent.onDestroy(this)
    }

    get ready() {
        return this._readyDefer.promise
    }


    get size(): number {
        return this.records.size
    }

    getRuntime(): Runtime {
        return this._runtime!
    }

    getParent(): Injector | null {
        return this._parent;
    }

    getInject(): InjectOperator {
        if (!this._operator) {
            this.assertNotDestroyed();
            this._operator = new DefaultInjectOperator(this);
        }
        return this._operator
    }


    has<T>(token: Token<T>, flags = InjectFlags.Default): boolean {
        this.assertNotDestroyed();
        if (this.getRuntime().hasSingleton(token)) return true;
        if (!(flags & InjectFlags.SkipSelf) && (this.records.has(token))) return true;
        if (!(flags & InjectFlags.Self)) {
            return this._parent?.has(token, flags) === true
        }
        return false
    }

    protected isself(token: Token): boolean {
        return this.isAlias ? this.isAlias(token) : false
    }

    get<T>(token: Token<T>, notFoundValue?: T, flags?: InjectFlags, environment?: Injector): T {
        this.assertNotDestroyed();
        if (this.isself(token)) return this as any;
        const runtime = this.getRuntime();
        if (runtime.hasSingleton(token)) return runtime.getSingleton(token);

        const record = this.records.get(token);
        return tryResolveToken(token, record, this.records, runtime, this._parent, environment ?? this,
            notFoundValue === undefined ? THROW_FLAGE : notFoundValue,
            flags ?? InjectFlags.Default, record?.stic ?? this.isStatic)
    }


    protected assertNotDestroyed(): void {
        assertNotDestroyed(this);
    }



    /**
     * resolve token in context.
     * 
     * 解析上下文中标记指令的实例值
     * @param token token id {@link Token}.
     * @param flags InjectFalgs 
     */
    resolve<T>(token: Token<T>, falgs?: InjectFlags): T;
    /**
     * resolve token instance with token and param provider.
     * 
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @param {Injector} environment the environment injector to raise resove.
     * @returns {T}
     */
    resolve<T>(token: Token<T>, environment?: Injector): T;
    /**
    * resolve token instance with token and param provider.
    * 
    * 解析标记令牌的实例。
    *
    * @template T
    * @param {Token<T>} token the resolve token {@link Token}.
    * @param {option} option the option of type {@link ResolverOption}, use to resolve with token.
    * @returns {T}
    */
    resolve<T>(token: Token<T>, option?: InjectorOptions): T;
    /**
     * resolve token instance with token and param provider.
     * 
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Token<T>} token the resolve token {@link Token}.
     * @param {Provider[]} providers the providers to resolve with token. array of {@link Provider}.
     * @returns {T}
     */
    resolve<T>(token: Token<T>, providers?: Provider[]): T;
    /**
     * resolve token instance with token and param provider.
     * 
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Token<T>} token the resolve token {@link Token}.
     * @param {...Provider[]} providers the providers {@link Provider} to resolve with token.
     * @returns {T}
     */
    resolve<T>(token: Token<T>, ...providers: Provider[]): T;
    resolve<T>(token: Token<T>, ...args: any[]): T {
        if (args.length === 0 || isNumber(args[0])) {
            return this.resolveArgument({ provider: token, flags:args[0]  } as Parameter<T>) as T;
        }

        let context: Injector | undefined;
        const isResolve = true;
        let isCtx = false;
        if (args.length === 1) {
            const arg1 = args[0];
            if (arg1 instanceof Injector) {
                context = arg1;
                isCtx = true;
            } else if (isArray(arg1)) {
                context = arg1.length ? createInjector({ isResolve, providers: arg1 }, this) : undefined;
            } else if (arg1.provide) {
                context = createInjector({ isResolve, providers: [arg1] }, this);
            } else if (hasProps(arg1)) {
                context = createInjector({ isResolve, ...arg1 }, this);
            }
        } else {
            context = createInjector({ isResolve, providers: args }, this);
        }

        const result = (context && !isCtx) ? context.resolve(token, InjectFlags.Resolve) : this.get(token, null, InjectFlags.Resolve, context) as T;

        if (context && !isCtx && !context.used) {
            immediate(() => context!.destroy());
        }
        return result;
    }



    /**
     * resolve the parameter value.
     * 
     * 解析调用参数
     * @param meta property or parameter metadata type of {@link Parameter}.
     * @returns the parameter value in this context.
     */
    resolveArgument<T>(meta: Partial<Parameter<T>>, target?: AbstractType, failed?: (target: AbstractType, propertyKey: string) => void): T | null {
        this.assertNotDestroyed();
        const metaRvr = meta.resolver;
        let resolver: HandlerScope | null;
        if (metaRvr?.length) {
            const runtime = this.getRuntime();
            resolver = createResolveScope(runtime, metaRvr.map(r => isType(r) ? this.resolve(r) : r), this.getResolver());
        } else {
            resolver = this.getResolver()
        }

        return resolver?.handle(meta, this, {
            next: (res, context) => {
                if (res === UNRESOLVED) {
                    if (failed) {
                        failed(target!, meta.propertyKey!)
                    } else {
                        this.missingException([meta], target!, meta.propertyKey!);
                    }
                    return null;
                }
                return res;
            },
            error: (error) => {
                if (error instanceof Error) {
                    throw error;
                }
                if (failed) {
                    failed(target!, meta.propertyKey!)
                } else {
                    this.missingException([meta], target!, meta.propertyKey!);
                }
            },
        })

    }

    protected missingException(missings: Partial<Parameter>[], type: AbstractType<any>, method: string): Exception {
        throw new MissingParameterException(missings, type, method)
    }

    /**
     * get context arguments resolvers.
     * @returns 
     */
    protected getArgumentResolver(): ResolveInterceptorLike[] {
        return [];
    }

    private _resolvers?: HandlerScope<Parameter, Injector> | null;
    /**
     * the invocation arguments resolver.
     */
    protected getResolver(): HandlerScope<Parameter, Injector> | null {
        if (this._resolvers === undefined) {
            const resolvers: ResolveInterceptorLike[] = [];
            const args = this.getArgumentResolver();
            if (args?.length) {
                resolvers.push(...args);
            }
            const resls = this.options?.resolvers?.map(r => isType(r) ? this.get(r) : r);
            if (resls?.length) {
                resolvers.push(...resls);
            }
            const runtime = this.getRuntime();
            if (resolvers.length) {
                this._resolvers = new HandlerScope(runtime, getParameterResolver(runtime), resolvers);
            } else {
                this._resolvers = getParameterResolver(runtime);
            }
        }
        return this._resolvers;
    }

    /**
     * has destoryed or not.
     */
    get destroyed() {
        return this._destroyed
    }
    /**
     * destroy this.
     */
    destroy(): void {
        return this._destroying()
    }


    /**
     * destroy hook.
     */
    onDestroy(): void;
    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    onDestroy(callback: DestroyCallback): void;
    onDestroy(callback?: DestroyCallback): void {
        if (!callback) {
            this._destroying()
        } else {
            this._dsryCbs.add(callback)
        }
    }

    offDestroy(callback: DestroyCallback) {
        this._dsryCbs.delete(callback)
    }


    private _destroying() {
        if (this._destroyed) return;
        this._destroyed = true;
        try {
            this._dsryCbs.forEach(cb => isFunction(cb) ? cb() : cb?.onDestroy());
        } finally {
            this._dsryCbs.clear();
            this.clear()
        }
        if (this.scope === 'root') {
            return this._parent?.destroy()
        }
    }


    protected clear() {
        this.scope && this.getRuntime()?.removeInjector(this.scope);
        this.records.forEach(r => {
            if (r?.type) this.getRuntime().clearTypeProvider(r.type);
        });
        this.records.clear();
        this.records = null!;
        if (this._parent) {
            !this._parent.destroyed && (this._parent as DefaultInjector).offDestroy?.(this)
        }
        this._runtime = null;
        this._operator = null;
        this.isAlias = null;
        this._parent = null;
    }
}


function assertNotDestroyed(injector: Injector): void {
    if (injector.destroyed) {
        throw new Exception(`${getTypeName(injector)} has already been destroyed.`)
    }
}


export class DefaultInjectOperator implements InjectOperator {

    @nonEnumerable
    private injector: Injector;

    constructor(injector: Injector) {
        this.injector = injector;
    }


    setSingleton<T>(token: Token<T>, value: T): this {
        Operator.setSingleton(this.injector, token, value);
        return this;
    }

    setValue<T>(token: Token<T>, value: T, type?: AbstractType<T> | undefined): this {
        Operator.setValue(this.injector, token, value, type);
        return this
    }

    getTokenProvider<T>(token: Token<T>, flags = InjectFlags.Default): AbstractType<T> {
        return Operator.getTokenProvider(this.injector, token, flags);
    }

    cache<T>(token: Token<T>, cache: T, expires: number): this {
        Operator.cache(this.injector, token, cache, expires);
        return this
    }

    inject(providers: Provider | Provider[]): this;
    inject(...providers: Provider[]): this;
    inject(...args: any[]): this {
        Operator.inject(this.injector, ...args);
        return this
    }

    use(modules: ModuleType[]): Type[];
    use(...modules: ModuleType[]): Type[];
    use(...args: any[]): Type[] {
        const types: Type[] = [];
        Operator.use(this.injector, args, types);
        return types
    }


    useAsync(modules: ModuleType[]): Promise<Type[]>;
    useAsync(...modules: ModuleType[]): Promise<Type[]>;
    useAsync(...args: any[]): Promise<Type[]> {
        return Operator.useAsync(this.injector, args);
    }


    register(types: (AbstractType | RegisterOption)[]): this;
    register(...types: (AbstractType | RegisterOption)[]): this;
    register(...args: any[]): this {
        Operator.register(this.injector, ...args);
        return this
    }

    unregister<T>(token: Token<T>): this {
        Operator.unregister(this.injector, token);
        return this
    }

    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, ...providers: Provider[]): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, option?: InjectorOptions): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, context?: Injector): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, providers: Provider[]): TR;
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, ...args: any[]): TR {
        return Operator.invoke(this.injector, target, propertyKey, ...args);
    }
}


/**
 * static injector.
 */
export class StaticInjector extends DefaultInjector {
    protected isStatic = true;
}


const platformAlias = [Injector, INJECTOR, CONTAINER];
const rootAlias = [Injector, INJECTOR, ROOT_INJECTOR];
const injectAlias = [Injector, INJECTOR];

const isPlatformAlias = (token: any) => token === Injector || token === INJECTOR || token === CONTAINER;
const isRootAlias = (token: any) => token === Injector || token === INJECTOR || token == ROOT_INJECTOR;
const isInjectAlias = (token: any) => token === Injector || token === INJECTOR;
const isStaticAlias = (token: any) => token === StaticInjector;

INJECT_IMPL.create = (options?: InjectorOptions, parent?: Injector) => {
    if (options?.scope === 'static' || isFunction(options?.scope)) {
        return new StaticInjector(options, parent)
    }
    return new DefaultInjector(options, parent)
};

INJECT_IMPL.isInjector = (target) => target instanceof DefaultInjector;



/**
 * register core for root.
 *
 * @export
 * @param {IContainer} container
 */
function registerCores(container: Injector, platform: Runtime) {
    platform.setSingleton(InvocationFactory, new DefaultInvocationFactory(platform), container);
}



/**
 * Missing argument execption.
 */
export class MissingParameterException extends Exception {
    constructor(parameters: Partial<Parameter>[], type: AbstractType, method: string) {
        super(`ailed to invoke operation because the following required parameters were missing: [ ${parameters.map(p => object2string(p)).join(',\n')} ], method ${method} of class ${object2string(type)}`)
    }
}


const deft = {
    typeInst: true,
    fun: true
}

/**
 * format object to string for log.
 * @param obj 
 * @returns 
 */
export function object2string(obj: any, options?: { typeInst?: boolean; fun?: boolean; }): string {
    options = { ...deft, ...options };
    if (isArray(obj)) {
        return `[${obj.map(v => object2string(v, options)).join(', ')}]`
    } else if (isString(obj)) {
        return `"${obj}"`
    } else if (isAbstractType(obj)) {
        return 'Type<' + getTypeName(obj) + '>'
    } else if (obj instanceof ClassRef) {
        return `[${obj.className} TypeReflect]`
    } else if (isPlainObject(obj)) {
        const str: string[] = [];
        for (const n in obj) {
            const value = obj[n];
            str.push(`${n}: ${object2string(value, options)}`)
        }
        return `{ ${str.join(', ')} }`
    } else if (options.typeInst && isTypeObject(obj)) {
        const fileds = Object.keys(obj).filter(k => k).map(k => `${k}: ${object2string(obj[k], { typeInst: false, fun: false })}`);
        return `[${getTypeName(obj)} {${fileds.join(', ')}} ]`
    }
    if (!options.fun && isFunction(obj)) {
        return 'Function'
    }
    return `${obj?.toString()}`
}



const UNRESOLVED = {};
const unResolve = <TInput, TOutput = any, TContext = any>(input: TInput, context: TContext) => UNRESOLVED as TOutput;

export function isResolved(value: any) {
    return value !== UNRESOLVED;
}

export function createResolveScope<TInput, TContext = any, TOutput = any>(runtime: Runtime, interceptors: InterceptorLike<TInput, TOutput, TContext>[], backend?: HandlerLike<TInput, TOutput, TContext> | null): HandlerScope<TInput, TContext, TOutput> {
    return new HandlerScope<TInput, TContext, TOutput>(runtime, backend ?? unResolve, interceptors)
}

const TOKER_RESOLVER = new ContextToken<HandlerScope<[Token, InjectFlags | undefined], Injector>>(() => null!);
export function getTokenResolver(runtime: Runtime): HandlerScope<[Token, InjectFlags | undefined], Injector> {
    let scope = runtime.context.get(TOKER_RESOLVER);
    if (!scope) {
        scope = createResolveScope(
            runtime,
            [
                (input, next, context) => {
                    if (context.has(input[0], input[1])) {
                        return context.get(input[0], null, input[1])
                    }
                    return next(input, context);
                },
                (input, next, context) => {
                    const [type, flags] = input
                    if (!isType(type) || getDef(type).abstract) {
                        return next(input, context);
                    }
                    if (!context.has(type, flags)) {
                        // const injector = context.getParent() ?? context.injector;
                        Operator.register(context, type);
                    }
                    return context.get(type, null, flags)
                },


            ]
        );
        runtime.context.set(TOKER_RESOLVER, scope);
    }
    return scope;
}

const PARAMETER_RESOLVER = new ContextToken<HandlerScope>(() => null!);
export function getParameterResolver(platform: Runtime): HandlerScope<Parameter, Injector> {
    let scope = platform.context.get(PARAMETER_RESOLVER);
    if (!scope) {
        scope = createResolveScope(
            platform,
            [
                (input, next, context) => {
                    if (input.provider && !input.multi) {
                        const value = getTokenResolver(platform).handle([input.provider, input.flags], context);
                        if (isResolved(value)) return value;
                    } else if (!input.multi && input.name && context.has(input.name, input.flags)) {
                        return context.get(input.name, input.flags)
                    } else if (input.type) {
                        const value = getTokenResolver(platform).handle([input.type, input.flags], context);
                        if (isResolved(value)) return value;
                    }
                    return next(input, context);
                },
                (input, next, context) => {

                    if (isDefined(input.defaultValue)) {
                        return input.defaultValue;
                    }
                    if (input.nullable === true || (input.flags && !!(input.flags & InjectFlags.Optional))) {
                        return null;
                    }

                    return next(input, context);
                }
            ]
        );
        platform.context.set(PARAMETER_RESOLVER, scope);
    }
    return scope;
}


