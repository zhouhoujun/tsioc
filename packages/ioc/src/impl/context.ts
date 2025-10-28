import { AbstractType } from '../types';
import { remove, getTypeName, getTypeChain } from '../utils/lang';
import { isArray, isFunction, isString, isAbstractType, getType, isType, isNil } from '../utils/chk';
import { ResolveInterceptorLike, Parameter } from '../resolver';
import { InvocationContext, TargetInvokeArguments, INVOCATION_CONTEXT_IMPL, InvokeArguments, InvocationRequest } from '../context';
import { isPlainObject, isTypeObject } from '../utils/obj';
import { InjectFlags, Token } from '../tokens';
import { Injector } from '../injector';
import { Exception } from '../exception';
import { ClassRef } from '../metadata/class';
import { getDef } from '../metadata/refl';
import { Invocation } from '../invocation';
import { ContextToken, HandlerLike, InterceptorLike } from '../handler';
import { HandlerScope } from '../lifescope/lifescope';
import { Runtime } from '../runtime';
import { nonEnumerable } from '../metadata/decor';
import { createValueRecord, NullInjectorException, THROW_FLAGE, tryResolveToken } from './common';
import { AbstractInjector, deferProcessProviders, Operator  } from './base';




/**
 * The context for the {@link Invocation invocation of an operation}.
 */
export class DefaultInvocationContext<TParent extends Injector = Injector> extends AbstractInjector<TParent> implements InvocationContext<TParent> {

    readonly isStatic = true;
    @nonEnumerable
    protected _refs: InvocationContext[] | null;
    private _injected = false;

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
        parent: TParent,
        private options: TargetInvokeArguments = {},
        readonly scope: AbstractType | 'static' = 'static'
    ) {
        super();
        this.records = new Map();
        this._refs = [];
        this.isResolve = options.isResolve == true;
        this._runtime = parent.getRuntime();
        this._parent = parent;
        parent.onDestroy(this);

        if (options.values) {
            options.values.forEach(par => {
                this.setValue(par[0], par[1]);
            })
        }

        const val = createValueRecord(this);
        getTypeChain(getType(this)).forEach(c => {
            this.records.set(c, val);
        });

        deferProcessProviders(this, options.providers, this._readyDefer);

        this.initRequest(options);


        this.targetType = options.targetType;
        this.propertyKey = options.propertyKey;
        this.afterInit();
    }

    override getParent(): TParent {
        return this._parent!;
    }

    protected afterInit(): void {

    }

    protected initRequest(options: TargetInvokeArguments) {
        this.request = options.request // || options.parent?.request;
    }

    attach(option: InvocationContext | InvokeArguments): void {

        if (option instanceof InvocationContext) {
            this.addRef(option);
            this.onDestroy(() => this.removeRef(option));
        } else {
            if (option.values) {
                option.values.forEach(par => {
                    Operator.setValue(this, par[0], par[1]);
                })
            }
            if (option.providers) {
                Operator.inject(this, option.providers);
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
            const resls = this.options.resolvers?.map(r => isType(r) ? this.get(r) : r);
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
    has(token: Token, flags = InjectFlags.Default): boolean {
        this.assertNotDestroyed();
        if (!(flags & InjectFlags.NonSingleton) && this.getRuntime().hasSingleton(token)) return true;
        if (!(flags & InjectFlags.SkipSelf) && (this.records.has(token))) return true;
        if (!(flags & InjectFlags.Self)) {
            return this._parent?.has(token, flags) === true
        }
        return this._refs!.some(i => i.has(token, flags))
    }

    /**
     * get token factory resolve instace in current.
     *
     * 获取标记令牌的实例。
     * @template T
     * @param {Token<T>} token token id {@link Token}.
     * @param {T} notFoundValue not found token, return this value.
     * @param {InjectFlags} flags check strategy by inject flags {@link InjectFlags}.
     * @param {Injector} raise invocation context. type of {@link Injector}, use to resolve with token.
     * @returns {T} token value.
     */
    get<T>(token: Token<T>, notFoundValue?: T, flags: InjectFlags = InjectFlags.Default, raise?: Injector): T {
        this.assertNotDestroyed();
        const runtime = this.getRuntime();
        if (!(flags & InjectFlags.NonSingleton) && runtime.hasSingleton(token)) return runtime.getSingleton(token);

        // 检查当前注入器记录
        const record = this.records.get(token);
        if (record && !(flags & InjectFlags.SkipSelf)) {
            const value = tryResolveToken(token, record, runtime, this, raise ?? this,
                null,
                flags, this.isStatic);
            if (!isNil(value)) return value;
        }

        // 父注入器查找
        if (this._parent && !(flags & InjectFlags.Self)) {
            const value = this._parent.get(
                token,
                null,
                flags & InjectFlags.NonSingleton,
                raise ?? this);

            if (!isNil(value)) {
                if (this.isStatic) this.records.set(token, { value })
                return value;
            }
        }

        if (this._refs?.length) {
            const value = this.getFormRef(token, flags);
            if (!isNil(value)) {
                if (this.isStatic) this.records.set(token, { value })
                return value;
            }
        }


        // 处理未找到的情况
        let value: T;
        if (!(flags & InjectFlags.Optional)) {
            if (notFoundValue === THROW_FLAGE) {
                throw new NullInjectorException(token);
            }
            value = notFoundValue ?? null!;
        } else {
            value = notFoundValue ?? null!;
        }

        return value;
    }

    protected getFormRef<T>(token: Token<T>, flags?: InjectFlags): T | undefined {
        let val: T | undefined;
        this._refs!.some(r => {
            val = r.get(token, undefined, flags);
            return !isNil(val);
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
        this.records.set(token, createValueRecord(value));
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



    protected clear() {
        super.clear();
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


INVOCATION_CONTEXT_IMPL.create = (parent: Injector, options?: TargetInvokeArguments, scope?: AbstractType | 'static') => {
    return new DefaultInvocationContext(parent, options, scope)
}

const UNRESOLVED = {};
const unResolve = <TInput, TOutput = any, TContext = any>(input: TInput, context: TContext) => UNRESOLVED as TOutput;

export function isResolved(value: any) {
    return value !== UNRESOLVED;
}

export function createResolveScope<TInput, TContext = any, TOutput = any>(runtime: Runtime, interceptors: InterceptorLike<TInput, TOutput, TContext>[], backend?: HandlerLike<TInput, TOutput, TContext> | null): HandlerScope<TInput, TContext, TOutput> {
    return new HandlerScope<TInput, TContext, TOutput>(runtime, backend ?? unResolve, interceptors)
}

const TOKER_RESOLVER = new ContextToken<HandlerScope<[Token, InjectFlags | undefined], InvocationContext>>(() => null!);
export function getTokenResolver(runtime: Runtime): HandlerScope<[Token, InjectFlags | undefined], InvocationContext> {
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
                        // Operator.register(context, type);
                        
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
export function getParameterResolver(platform: Runtime): HandlerScope<Parameter, InvocationContext> {
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

                    if (!isNil(input.defaultValue)) {
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


