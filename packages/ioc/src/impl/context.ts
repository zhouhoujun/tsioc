import { AbstractType } from '../types';
import { remove, deepTypeChain } from '../utils/lang';
import { getType, isType, isNil } from '../utils/chk';
import { ResolveInterceptorLike, Parameter, Resolver } from '../resolver';
import { InvocationContext, TargetInvokeArguments, INVOCATION_CONTEXT_IMPL, InvokeOptions } from '../context';
import { InjectFlags, Token } from '../tokens';
import { Injector } from '../injector';
import { Invocation } from '../invocation';
import { RuntimeHandler } from '../lifescope/handler';
import { nonEnumerable } from '../metadata/decor';
import { createRecord, createValueRecord, LAZY, NullInjectorException, THROW_FLAGE, tryResolveToken } from './common';
import { AbstractInjector, deferProcessProviders } from './injector';
import { DefaultResolver, getParameterResolveHanlder } from './resolver';




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

    /**
     * get the invocation arguments resolver.
     */

    constructor(
        parent: TParent,
        private options: TargetInvokeArguments = {},
        scope: AbstractType | 'static' = 'static'
    ) {
        super(parent, scope);
        this._refs = [];
        this.initOptions(this.options);
        this.isResolve = options.isResolve == true;
        if (options.values?.length) {
            for (let i = 0, len = options.values.length; i < len; i++) {
                const par = options.values[i];
                this.setValue(par[0], par[1]);
            }
        }

        const val = createValueRecord(this);
        deepTypeChain(getType(this), c => {
            this.records.set(c, val);
        });

        this.records.set(Resolver, createRecord(() => new DefaultResolver(this.getResolver())))

        deferProcessProviders(this, options.providers, this._readyDefer);

        this.targetType = options.targetType;
        this.propertyKey = options.propertyKey;
        this.afterInit();
    }

    protected initOptions(options: TargetInvokeArguments) {
        
    }

    override getParent(): TParent {
        return this._parent!;
    }

    protected afterInit(): void {

    }

    attach(option: InvocationContext | InvokeOptions): void {
        if (isInvocationContext(option)) {
            this.addRef(option);
            this.onDestroy(() => this.removeRef(option));
        } else {
            if (option.values?.length) {
                for (let i = 0, len = option.values.length; i < len; i++) {
                    const par = option.values[i];
                    this.setValue(par[0], par[1])
                }
            }
            if (option.providers?.length) {
                deferProcessProviders(this, option.providers, this._readyDefer);
            }
            if (option.resolvers) {
                if (option.resolvers?.length) {
                    this._resolvers = null;
                    const rrd = this.records.get(Resolver);
                    if (rrd && rrd.value && rrd.value !== LAZY) {
                        rrd.value = LAZY;
                    }
                    this.options.resolvers = option.resolvers.concat(this.options.resolvers ?? [])
                }
            }
        }
    }



    private _resolvers?: RuntimeHandler<Parameter> | null;
    /**
     * the invocation arguments resolver.
     */
    protected getResolver(): RuntimeHandler<Parameter> {
        if (!this._resolvers) {
            const resolvers: ResolveInterceptorLike[] = [];
            const resls = this.options.resolvers?.map(r => isType(r) ? this.get(r) : r);
            if (resls?.length) {
                resolvers.push(...resls);
            }
            const runtime = this.getRuntime();
            if (resolvers.length) {
                this._resolvers = new RuntimeHandler(getParameterResolveHanlder(runtime), resolvers as any[]);
            } else {
                this._resolvers = getParameterResolveHanlder(runtime);
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
        for (let i = 0, len = contexts.length; i < len; i++) {
            const j = contexts[i];
            if (!this.hasRef(j)) {
                this._refs!.unshift(j)
            }
        }
    }

    /**
     * remove reference resolver.
     * @param contexts instance of {@link InvocationContext}.
     */
    removeRef(...contexts: InvocationContext[]): void {
        this.assertNotDestroyed();
        for (let i = 0, len = contexts.length; i < len; i++) {
            const j = contexts[i];
            remove(this._refs, j);
        }
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
        if (!(flags & InjectFlags.NonSingleton) && this.getRuntime().has(token)) return true;
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
        if (!(flags & InjectFlags.NonSingleton) && runtime.has(token)) return runtime.get(token);

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


    protected clear() {
        super.clear();
        this._resolvers = null;
        this._refs = null;
    }

}

INVOCATION_CONTEXT_IMPL.create = (parent: Injector, options?: TargetInvokeArguments, scope?: AbstractType | 'static') => {
    return new DefaultInvocationContext(parent, options, scope)
}

INVOCATION_CONTEXT_IMPL.isContext = (ctx: any): ctx is InvocationContext => {
    return isInvocationContext(ctx);
}

export function isInvocationContext(ctx: any): ctx is InvocationContext {
    return ctx instanceof DefaultInvocationContext;
}
