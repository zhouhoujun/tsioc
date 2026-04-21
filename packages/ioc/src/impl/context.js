"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextInjector = void 0;
const lang_1 = require("../utils/lang");
const type_1 = require("../metadata/type");
const resolver_1 = require("../resolver");
const injector_1 = require("../injector");
const handler_1 = require("../lifescope/handler");
const common_1 = require("./common");
const injector_2 = require("./injector");
const resolver_2 = require("./resolver");
const token_1 = require("../utils/token");
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
class ContextInjector extends injector_2.AbstractInjector {
    /**
     * get the invocation arguments resolver.
     */
    constructor(parent, options = {}, scope = 'static') {
        super(parent, scope);
        this.options = options;
        this.isStatic = true;
        this.initOptions(this.options);
        // Optimize: Only process values if they exist
        if (options.values?.length) {
            const values = options.values;
            for (let i = 0, len = values.length; i < len; i++) {
                const [token, value] = values[i];
                this.records.set(token, (0, common_1.createValueRecord)(value));
            }
        }
        const val = (0, common_1.createValueRecord)(this);
        (0, lang_1.deepTypeChain)((0, type_1.getType)(this), c => {
            this.records.set(c, val);
        });
        this.records.set(resolver_1.Resolver, (0, common_1.createRecord)(() => new resolver_2.DefaultResolver(this.getResolver())));
        (0, injector_2.deferProcessProviders)(this, options.providers, this._readyDefer);
        this.targetType = options.targetType;
        this.propertyKey = options.propertyKey;
        this.afterInit();
    }
    initScope(scope) {
        this._runtime = this._parent.getRuntime();
        this._runtime.register(this);
    }
    initOptions(options) {
    }
    afterInit() {
    }
    /**
     * the invocation arguments resolver.
     * Optimized with lazy initialization and caching.
     */
    getResolver() {
        if (!this._resolvers) {
            const resls = this.options.resolvers;
            if (resls?.length) {
                const resolvers = [];
                for (let i = 0, len = resls.length; i < len; i++) {
                    const r = resls[i];
                    const resolved = (0, token_1.isToken)(r) ? this.get(r) : r;
                    if (Array.isArray(resolved)) {
                        resolvers.push(...resolved);
                    }
                    else {
                        resolvers.push(resolved);
                    }
                }
                const runtime = this.getRuntime();
                this._resolvers = new handler_1.RuntimeHandler((0, resolver_2.getParameterResolveHanlder)(runtime), resolvers);
            }
            else {
                this._resolvers = (0, resolver_2.getParameterResolveHanlder)(this.getRuntime());
            }
        }
        return this._resolvers;
    }
    defaultNotFound() {
        return null;
    }
    clear() {
        super.clear();
        this._resolvers = null;
    }
}
exports.ContextInjector = ContextInjector;
injector_1.INJECT_IMPL.createByOptions = (parent, options, scope) => {
    return new ContextInjector(parent, options, scope);
};
//# sourceMappingURL=context.js.map