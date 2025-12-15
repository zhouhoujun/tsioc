import { AbstractType } from '../types';
import { remove, deepTypeChain } from '../utils/lang';
import { isNil } from '../utils/chk';
import { getType, isType } from '../metadata/type';
import { ResolveInterceptorLike, Parameter, Resolver } from '../resolver';
import { InvocationContext, TargetInvokeArguments, INVOCATION_CONTEXT_IMPL, InvokeOptions } from '../context';
import { InjectFlags, Token } from '../tokens';
import { Injector } from '../injector';
import { Invocation } from '../invocation';
import { RuntimeHandler } from '../lifescope/handler';
import { nonEnumerable } from '../metadata/decor';
import { createRecord, createValueRecord, LAZY } from './common';
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
            if (this.addRef(option)) {
                this.onDestroy(() => this.removeRef(option));
            }
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
    addRef(context: InvocationContext): boolean {
        // this.assertNotDestroyed();

        if (!this.hasRef(context)) {
            this._refs!.unshift(context);
            return true;
        }

        return false;
    }



    /**
     * remove reference resolver.
     * @param context instance of {@link InvocationContext}.
     */
    removeRef(context: InvocationContext): void {
        this.assertNotDestroyed();
        remove(this._refs, context);
    }

    hasRef(ctx: InvocationContext): boolean {
        this.assertNotDestroyed();
        return this.existRef(ctx) || (ctx instanceof DefaultInvocationContext && ctx.existRef(this));
    }

    protected existRef(ctx: InvocationContext): boolean {
        if (ctx === this || this._refs!.indexOf(ctx) >= 0) return true;
        const parent = this.getParent() as TParent & DefaultInvocationContext;
        if(parent === ctx) return true;
        return parent?.existRef?.(ctx) ?? false;
    }

    get used(): boolean {
        return this._injected
    }

    protected defaultNotFound() {
        return null;
    }

    protected override hasFinal<T>(token: Token<T>, flags: InjectFlags): boolean {
        return this._refs!.some(i => i.has(token, flags))
    }

    protected override getFinal<T>(token: Token<T>, flags: InjectFlags): T | undefined | null {
        if (this._refs?.length) {
            const value = this.getFormRef(token, flags);
            if (!isNil(value)) {
                if (this.isStatic) this.records.set(token, createValueRecord(value))
                return value;
            }
        }
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
