import { AbstractType } from '../types';
import { deepTypeChain } from '../utils/lang';
import { getType } from '../metadata/type';
import { ResolveInterceptorLike, Parameter, Resolver } from '../resolver';
import { TargetInvokeArguments } from '../context';
import { INJECT_IMPL, Injector, InjectorScope } from '../injector';
import { RuntimeHandler } from '../lifescope/handler';
import { createRecord, createValueRecord, LAZY } from './common';
import { AbstractInjector, deferProcessProviders } from './injector';
import { DefaultResolver, getParameterResolveHanlder } from './resolver';
import { isToken } from '../utils/token';




/**
 * The context for the {@link Invocation invocation of an operation}.
 *
 * Optimized implementation that minimizes overhead by:
 * 1. Delegating to parent Injector for most operations
 * 2. Using static caching for frequently accessed tokens
 * 3. Lazy initialization of resolvers
 * 4. Using Context for dependency relationships instead of refs
 *
 * 优化的实现，通过以下方式最小化开销：
 * 1. 将大多数操作委托给父 Injector
 * 2. 对频繁访问的令牌使用静态缓存
 * 3. 延迟初始化解析器
 * 4. 使用 Context 管理依赖关系而不是引用
 */
export class ContextInjector<TParent extends Injector = Injector> extends AbstractInjector<TParent> {

    readonly isStatic: boolean = true;

    /**
     * invocation target type.
     */
    readonly targetType: AbstractType | undefined;

    /**
     * named of invocation method.
     */
    readonly propertyKey: string | symbol | undefined;

    /**
     * get the invocation arguments resolver.
     */

    constructor(
        parent: TParent,
        private options: TargetInvokeArguments = {},
        scope: AbstractType | 'static' = 'static'
    ) {
        super(parent, scope);
        this.initOptions(this.options);

        // Optimize: Only process values if they exist
        if (options.values?.length) {
            const values = options.values;
            for (let i = 0, len = values.length; i < len; i++) {
                const [token, value] = values[i];
                this.records.set(token, createValueRecord(value));
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

    protected override initScope(scope?: InjectorScope): void {
        this._runtime = this._parent!.getRuntime();
        this._runtime.register(this);
    }

    protected initOptions(options: TargetInvokeArguments) {

    }

    protected afterInit(): void {

    }

    private _resolvers?: RuntimeHandler<Parameter> | null;
    /**
     * the invocation arguments resolver.
     * Optimized with lazy initialization and caching.
     */
    protected getResolver(): RuntimeHandler<Parameter> {
        if (!this._resolvers) {
            const resls = this.options.resolvers;
            if (resls?.length) {
                const resolvers: ResolveInterceptorLike[] = [];
                for (let i = 0, len = resls.length; i < len; i++) {
                    const r = resls[i];
                    const resolved = isToken(r) ? this.get(r) : r;
                    if (Array.isArray(resolved)) {
                        resolvers.push(...resolved);
                    } else {
                        resolvers.push(resolved);
                    }
                }
                const runtime = this.getRuntime();
                this._resolvers = new RuntimeHandler(getParameterResolveHanlder(runtime), resolvers as any[]);
            } else {
                this._resolvers = getParameterResolveHanlder(this.getRuntime());
            }
        }
        return this._resolvers;
    }

    protected defaultNotFound() {
        return null;
    }

    protected clear() {
        super.clear();
        this._resolvers = null;
    }

}


INJECT_IMPL.createByOptions = (parent, options, scope) => {
    return new ContextInjector(parent, options, scope)
}
