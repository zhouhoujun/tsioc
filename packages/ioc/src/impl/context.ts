import { AbstractType } from '../types';
import { Destroyable, DestroyCallback, OnDestroy } from '../destroy';
import { remove, getTypeName, getTypeChain } from '../utils/lang';
import { isArray, isDefined, isFunction, isString, isAbstractType, getType, isType } from '../utils/chk';
import { ResolveInterceptorLike, Parameter } from '../resolver';
import { InvocationContext, TargetInvokeArguments, INVOCATION_CONTEXT_IMPL, InvokeArguments, InvocationRequest } from '../context';
import { isPlainObject, isTypeObject } from '../utils/obj';
import { InjectFlags, Token } from '../tokens';
import { createInjector, Injector, isInjector } from '../injector';
import { Exception } from '../exception';
import { ClassRef } from '../metadata/class';
import { getDef } from '../metadata/refl';
import { Provider } from '../providers';
import { Invocation } from '../invocation';
import { ContextToken, HandlerLike, InterceptorLike } from '../handler';
import { HandlerScope } from '../lifescope/lifescope';
import { Platform } from '../platform';



/**
 * The context for the {@link Invocation invocation of an operation}.
 */
export class DefaultInvocationContext extends InvocationContext implements Destroyable, OnDestroy {

    protected _refs: InvocationContext[] | null;
    private _injected = false;

    private _dsryCbs = new Set<DestroyCallback>();
    private _destroyed = false;

    /**
     * invocation static injector. 
     */
    readonly injector: Injector;
    /**
     * invocation target type.
     */
    readonly targetType: AbstractType | undefined;

    /**
     * named of invocation method.
     */
    readonly propertyKey: string | symbol | undefined;

    readonly isResolve: boolean;

    request: InvocationRequest | null | undefined;

    /**
     * get the invocation arguments resolver.
     */

    constructor(
        injector: Injector,
        private options: TargetInvokeArguments = {},
        private injectorScope: AbstractType | 'static' = 'static'
    ) {
        super();
        this._refs = [];
        this.isResolve = options.isResolve == true;
        this.injector = this.createInjector(injector, options.providers);
        if (options.parent && injector !== options.parent.injector) {
            const parent = options.parent;
            this.addRef(parent);
            parent.onDestroy(() => {
                !this.destroyed && this.removeRef(parent);
            });
        }

        if (options.values) {
            options.values.forEach(par => {
                this.injector.setValue(par[0], par[1]);
            })
        }

        this.initRequest(options);

        getTypeChain(getType(this)).forEach(c => {
            this.setValue(c, this);
        });

        this.targetType = options.targetType;
        this.propertyKey = options.propertyKey;
        injector.onDestroy(this);
    }

    protected initRequest(options: TargetInvokeArguments) {
        this.request = options.request || options.parent?.request;
    }

    attach(option: InvocationContext | InvokeArguments): void {

        if (option instanceof InvocationContext) {
            this.addRef(option);
            this.onDestroy(() => this.removeRef(option));
        } else {
            if (option.values) {
                option.values.forEach(par => {
                    this.injector.setValue(par[0], par[1]);
                })
            }
            if (option.providers) {
                this.injector.inject(option.providers);
            }
            if (option.resolvers) {
                if (option.resolvers?.length) {
                    this._resolvers = null;
                    this.options.resolvers = option.resolvers.concat(this.options.resolvers ?? [])
                }
            }
        }
    }

    /**
     * get context arguments resolvers.
     * @returns 
     */
    protected getArgumentResolver(): ResolveInterceptorLike[] {
        return [];
    }

    private _resolvers?: HandlerScope<Parameter, InvocationContext> | null;
    /**
     * the invocation arguments resolver.
     */
    protected getResolver(): HandlerScope<Parameter, InvocationContext> | null {
        if (this._resolvers === undefined) {
            const resolvers: ResolveInterceptorLike[] = [];
            const args = this.getArgumentResolver();
            if (args?.length) {
                resolvers.push(...args);
            }
            const resls = this.options.resolvers?.map(r => isType(r) ? this.injector.get(r) : r);
            if (resls?.length) {
                resolvers.push(...resls);
            }
            const platform = this.injector.platform();
            if (resolvers.length) {
                this._resolvers = new HandlerScope(platform, getParameterResolver(platform), resolvers);
            } else {
                this._resolvers = getParameterResolver(platform);
            }
        }
        return this._resolvers;
    }



    protected createInjector(injector: Injector, providers?: Provider[]) {
        return createInjector(providers, injector, this.injectorScope)
    }

    /**
     * add reference contexts.
     * @param contexts the list instance of {@link Injector} or {@link InvocationContext}.
     */
    addRef(...contexts: InvocationContext[]): void {
        this.assertNotDestroyed();
        contexts.forEach(j => {
            if (!this.hasRef(j)) {
                this._refs!.unshift(j)
            }
        })
    }

    /**
     * remove reference resolver.
     * @param contexts instance of {@link InvocationContext}.
     */
    removeRef(...contexts: InvocationContext[]): void {
        this.assertNotDestroyed();
        contexts.forEach(context => remove(this._refs, context));
    }

    hasRef(ctx: InvocationContext): boolean {
        this.assertNotDestroyed();
        return ctx === this && this._refs!.indexOf(ctx) >= 0;
    }

    get used(): boolean {
        return this._injected
    }

    /**
     * has token in the context or not.
     * 
     * 上下文中是否有注入该标记指令
     * @param token the token to check.
     * @param flags inject flags, type of {@link InjectFlags}.
     * @returns boolean.
     */
    has(token: Token, flags?: InjectFlags): boolean {
        this.assertNotDestroyed();
        return (flags != InjectFlags.HostOnly && this.injector.has(token, flags))
            || this._refs!.some(i => i.has(token, flags))
    }

    /**
     * get token value.
     * 
     * 获取上下文中标记指令的实例值
     * @param token the token to get value.
     * @param flags inject flags, type of {@link InjectFlags}.
     * @returns the instance of token.
     */
    get<T>(token: Token<T>, flags?: InjectFlags): T {
        this.assertNotDestroyed();
        return (flags != InjectFlags.HostOnly ? this.injector.get(token, null, flags, this) : null)
            ?? this.getFormRef(token, flags) ?? null as T
    }

    protected getFormRef<T>(token: Token<T>, flags?: InjectFlags): T | undefined {
        let val: T | undefined;
        this._refs!.some(r => {
            val = r.get(token, flags);
            return isDefined(val)
        });

        return val
    }

    /**
     * set value.
     * 
     * 设置上下文中标记指令的实例值
     * @param token token
     * @param value value for the token.
     */
    setValue<T>(token: Token<T>, value: T) {
        this.assertNotDestroyed();
        this.injector.setValue(token, value);
        return this
    }

    /**
     * resolve token.
     * 
     * 解析上下文中标记指令的实例值
     * @param token 
     * @returns 
     */
    resolve<T>(token: Token<T>, flags?: InjectFlags): T {
        return this.resolveArgument({ provider: token, flags } as Parameter<T>) as T;
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
            const platform = this.injector.platform();
            resolver = createResolveScope(platform, metaRvr.map(r => isType(r) ? this.resolve(r) : r), this.getResolver());
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

    get destroyed() {
        return this._destroyed
    }

    protected assertNotDestroyed(): void {
        if (this.destroyed) {
            throw new Exception('Context has already been destroyed.')
        }
    }

    destroy(): void {
        return this._destroying()
    }

    onDestroy(callback?: DestroyCallback): void {
        if (!callback) {
            return this._destroying()
        }
        this._dsryCbs.add(callback)
    }

    private _destroying() {
        if (!this._destroyed) {
            this._destroyed = true;

            this._dsryCbs.forEach(c => isFunction(c) ? c() : c?.onDestroy())

            this._dsryCbs.clear();
            this.clear();
            const injector = this.injector;
            (this as any).parent = null;
            (this as any).injector = null;
            return injector.destroy();
        }
    }

    protected clear() {
        this._resolvers = null;
        this._refs = null;
    }

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


INVOCATION_CONTEXT_IMPL.create = (parent: Injector | InvocationContext, options?: TargetInvokeArguments, scope?: AbstractType | 'static') => {
    if (isInjector(parent)) {
        return new DefaultInvocationContext(parent, options, scope)
    } else {
        return new DefaultInvocationContext(parent.injector, { parent, ...options }, scope)
    }
}

const UNRESOLVED = {};
const unResolve = <TInput, TOutput = any, TContext = any>(input: TInput, context: TContext) => UNRESOLVED as TOutput;

export function isResolved(value: any) {
    return value !== UNRESOLVED;
}

export function createResolveScope<TInput, TContext = any, TOutput = any>(platform: Platform, interceptors: InterceptorLike<TInput, TOutput, TContext>[], backend?: HandlerLike<TInput, TOutput, TContext> | null): HandlerScope<TInput, TContext, TOutput> {
    return new HandlerScope<TInput, TContext, TOutput>(platform, backend ?? unResolve, interceptors)
}

const TOKER_RESOLVER = new ContextToken<HandlerScope<[Token, InjectFlags | undefined], InvocationContext>>(() => null!);
export function getTokenResolver(platform: Platform): HandlerScope<[Token, InjectFlags | undefined], InvocationContext> {
    let scope = platform.context.get(TOKER_RESOLVER);
    if (!scope) {
        scope = createResolveScope(
            platform,
            [
                (input, next, context) => {
                    if (context.has(input[0], input[1])) {
                        return context.get(input[0], input[1])
                    }
                    return next(input, context);
                },
                (input, next, context) => {
                    const [type, flags] = input
                    if (!isType(type) || getDef(type).abstract) {
                        return next(input, context);
                    }
                    if (!context.has(type, flags)) {
                        const injector = context.injector.parent ?? context.injector;
                        injector.register(type);
                    }
                    return context.get(type, flags)
                },


            ]
        );
        platform.context.set(TOKER_RESOLVER, scope);
    }
    return scope;
}

const PARAMETER_RESOLVER = new ContextToken<HandlerScope>(() => null!);
export function getParameterResolver(platform: Platform): HandlerScope<Parameter, InvocationContext> {
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


