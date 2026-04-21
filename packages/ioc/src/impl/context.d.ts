import { AbstractType } from '../types';
import { Parameter } from '../resolver';
import { TargetInvokeArguments } from '../context';
import { Injector, InjectorScope } from '../injector';
import { RuntimeHandler } from '../lifescope/handler';
import { AbstractInjector } from './injector';
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
export declare class ContextInjector<TParent extends Injector = Injector> extends AbstractInjector<TParent> {
    private options;
    readonly isStatic: boolean;
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
    constructor(parent: TParent, options?: TargetInvokeArguments, scope?: AbstractType | 'static');
    protected initScope(scope?: InjectorScope): void;
    protected initOptions(options: TargetInvokeArguments): void;
    protected afterInit(): void;
    private _resolvers?;
    /**
     * the invocation arguments resolver.
     * Optimized with lazy initialization and caching.
     */
    protected getResolver(): RuntimeHandler<Parameter>;
    protected defaultNotFound(): null;
    protected clear(): void;
}
