"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InjectUtil = exports.DefaultInjector = exports.StaticInjector = exports.DefaultEnvironmentInjector = exports.AbstractInjector = exports.SCOPE_PRODIDERS = void 0;
exports.assertNotDestroyed = assertNotDestroyed;
exports.deferProcessProviders = deferProcessProviders;
exports.processProviders = processProviders;
exports.generateRecord = generateRecord;
exports.generateTypeRecord = generateTypeRecord;
exports.register = register;
exports.processInjectType = processInjectType;
exports.processInjectDeclarations = processInjectDeclarations;
exports.processUse = processUse;
const tslib_1 = require("tslib");
const types_1 = require("../types");
const tokens_1 = require("../tokens");
const lang_1 = require("../utils/lang");
const chk_1 = require("../utils/chk");
const type_1 = require("../metadata/type");
const injector_1 = require("../injector");
const exception_1 = require("../exception");
const class_1 = require("../metadata/class");
const providers_1 = require("../providers");
const context_1 = require("../context");
const decor_1 = require("../metadata/decor");
const common_1 = require("./common");
const obj_1 = require("../utils/obj");
const context_2 = require("../lifescope/context");
const resolver_1 = require("../resolver");
const invocation_1 = require("../invocation");
const invocation_2 = require("./invocation");
const runtime_1 = require("./runtime");
const type_def_1 = require("../metadata/type.def");
const contexts_1 = require("../handlers/contexts");
exports.SCOPE_PRODIDERS = [];
/**
 * Default Injector
 */
class AbstractInjector extends injector_1.Injector {
    constructor(parent, scope, isStatic) {
        super();
        this.scope = scope;
        this.isStatic = isStatic;
        this._destroyed = false;
        this._dsryCbs = new Set();
        this._runtime = null;
        this._readyDefer = (0, lang_1.defer)();
        this.records = this[injector_1.RECORDS] = new Map();
        this._parent = parent;
        this.initScope(scope);
        parent?.onDestroy(this);
    }
    get ready() {
        return this._readyDefer.promise;
    }
    getRuntime() {
        return this._runtime;
    }
    getParent() {
        return this._parent;
    }
    has(token, flags = tokens_1.InjectFlags.Default) {
        this.assertNotDestroyed();
        if (!(flags & tokens_1.InjectFlags.NonSingleton) && this.getRuntime().has(token))
            return true;
        if (!(flags & tokens_1.InjectFlags.SkipSelf) && (this.records.has(token)))
            return true;
        if (!(flags & tokens_1.InjectFlags.Self)) {
            return this._parent?.has(token, flags | tokens_1.InjectFlags.NonSingleton) === true;
        }
        return this.hasFinal(token, flags);
    }
    hasFinal(token, flags) {
        return false;
    }
    defaultNotFound() {
        return common_1.THROW_FLAGE;
    }
    get(token, notFoundValue, flags = tokens_1.InjectFlags.Default, context) {
        this.assertNotDestroyed();
        const runtime = this.getRuntime();
        if (!(flags & tokens_1.InjectFlags.NonSingleton)) {
            const singleton = runtime.get(token);
            if (singleton !== null)
                return singleton;
        }
        if (notFoundValue === undefined) {
            notFoundValue = this.defaultNotFound();
        }
        if (!(flags & (tokens_1.InjectFlags.SkipSelf | tokens_1.InjectFlags.Host))) {
            const record = this.records.get(token);
            if (record) {
                const value = (0, common_1.tryResolveToken)(token, record, this, notFoundValue, flags, context);
                if (value !== common_1.THROW_FLAGE)
                    return value;
            }
        }
        if (this._parent && !(flags & tokens_1.InjectFlags.Self)) {
            const value = this._parent.get(token, notFoundValue, (!(flags & tokens_1.InjectFlags.Host) ? flags : tokens_1.InjectFlags.Self) & tokens_1.InjectFlags.NonSingleton, context);
            if (!(0, chk_1.isNil)(value) && value !== common_1.THROW_FLAGE) {
                if (this.isStatic && this.isStaticToken(token) !== false)
                    this.records.set(token, (0, common_1.createValueRecord)(value));
                return value;
            }
        }
        return this.getFinal(token, flags, context)
            ?? this.notFound(token, notFoundValue, flags, context);
    }
    isStaticToken(token) {
        const record = this.records.get(token);
        if ((0, chk_1.isBoolean)(record?.stati))
            return record.stati;
        // if (record ) {
        //     if(isBoolean(record.stati)) return record.stati;
        //     if(record.factory) return this.isStatic === true;
        // }
        return this.getParent()?.isStaticToken?.(token) ?? false;
    }
    getFinal(token, flags, context) {
        return;
    }
    notFound(token, notFoundValue, flags, context) {
        // 处理未找到的情况
        let value;
        if (!(flags & tokens_1.InjectFlags.Optional)) {
            if (notFoundValue === common_1.THROW_FLAGE) {
                throw new common_1.NullInjectorException(token);
            }
            value = notFoundValue ?? null;
        }
        else {
            value = notFoundValue ?? null;
        }
        return value;
    }
    resolve(tokenOrParam, arg, context) {
        if ((0, resolver_1.isParameter)(tokenOrParam)) {
            return (0, resolver_1.getResolver)(this).resolve(tokenOrParam, arg ?? (0, contexts_1.createRunContext)(this));
        }
        else {
            let flags;
            if ((0, chk_1.isNumber)(arg)) {
                flags = arg;
            }
            else if (!context) {
                context = arg;
            }
            return (0, resolver_1.getResolver)(this).resolve({ provider: tokenOrParam, flags }, context ?? (0, contexts_1.createRunContext)(this));
        }
    }
    /**
     * set value.
     *
     * 设置上下文中标记指令的实例值
     * @param token token
     * @param value value for the token.
     */
    setValue(token, value) {
        this.assertNotDestroyed();
        this.records.set(token, (0, common_1.createValueRecord)(value));
        return this;
    }
    /**
     * has destoryed or not.
     */
    get destroyed() {
        return this._destroyed;
    }
    /**
     * destroy this.
     */
    destroy() {
        return this._destroying();
    }
    onDestroy(callback) {
        if (!callback) {
            this._destroying();
        }
        else {
            this._dsryCbs.add(callback);
        }
    }
    offDestroy(callback) {
        this._dsryCbs.delete(callback);
    }
    _destroying() {
        if (this._destroyed)
            return;
        this._destroyed = true;
        try {
            this._dsryCbs.forEach(cb => (0, chk_1.isFunction)(cb) ? cb() : cb?.onDestroy());
        }
        finally {
            this._dsryCbs.clear();
            this.clear();
        }
        if (this.scope === 'root') {
            return this._parent?.destroy();
        }
    }
    clear() {
        this.scope && this.getRuntime()?.removeInjector(this.scope);
        this.records.forEach(r => {
            if (r?.type)
                this.getRuntime().clearTypeProvider(r.type);
        });
        this.records.clear();
        if (this._parent) {
            !this._parent.destroyed && this._parent.offDestroy?.(this);
        }
        this._runtime = null;
        this._parent = null;
    }
    assertNotDestroyed() {
        assertNotDestroyed(this);
    }
}
exports.AbstractInjector = AbstractInjector;
_a = types_1.noPointcut;
/**
 * none poincut for aop.
 *
 * 该类是否支持AOP注入
 */
AbstractInjector[_a] = true;
tslib_1.__decorate([
    decor_1.nonEnumerable,
    tslib_1.__metadata("design:type", Object)
], AbstractInjector.prototype, "_dsryCbs", void 0);
tslib_1.__decorate([
    decor_1.nonEnumerable,
    tslib_1.__metadata("design:type", Object)
], AbstractInjector.prototype, "_runtime", void 0);
tslib_1.__decorate([
    decor_1.nonEnumerable,
    tslib_1.__metadata("design:type", Map)
], AbstractInjector.prototype, "records", void 0);
tslib_1.__decorate([
    decor_1.nonEnumerable,
    tslib_1.__metadata("design:type", Object)
], AbstractInjector.prototype, "_parent", void 0);
function assertNotDestroyed(injector) {
    if (injector.destroyed) {
        throw new exception_1.Exception(`${(0, type_1.getTypeName)(injector)} has already been destroyed.`);
    }
}
/**
 * Environment Injector
 */
class DefaultEnvironmentInjector extends AbstractInjector {
    constructor(providers) {
        super(null, 'platform');
        deferProcessProviders(this, providers, this._readyDefer);
    }
    initScope(scope) {
        const val = (0, common_1.createValueRecord)(this);
        this.records.set(injector_1.Injector, val);
        this.records.set(injector_1.EnvironmentInjector, val);
        this.records.set(injector_1.CONTAINER, val);
        const runtime = this._runtime = new runtime_1.DefaultRuntime(this);
        runtime.set(invocation_1.InvocationFactory, new invocation_2.DefaultInvocationFactory(runtime), this);
    }
}
exports.DefaultEnvironmentInjector = DefaultEnvironmentInjector;
/**
 * static injector.
 */
class StaticInjector extends AbstractInjector {
    constructor(parent, providers, scope) {
        super(parent, scope ?? 'static', true);
        deferProcessProviders(this, providers, this._readyDefer);
    }
    initScope(scope) {
        this._runtime = this._parent.getRuntime();
        const val = (0, common_1.createValueRecord)(this);
        this.records.set(injector_1.Injector, val);
        this.records.set(StaticInjector, val);
        this._runtime.register(this, scope);
    }
}
exports.StaticInjector = StaticInjector;
/**
 * Default Injector
 */
class DefaultInjector extends AbstractInjector {
    constructor(parent, providers, scope, isStatic) {
        super(parent, scope, isStatic);
        deferProcessProviders(this, providers, this._readyDefer);
    }
    initScope(scope) {
        this._runtime = this._parent.getRuntime();
        const val = (0, common_1.createValueRecord)(this);
        this.records.set(injector_1.Injector, val);
        this._runtime.register(this, scope);
        if (scope === 'root') {
            this.records.set(injector_1.INJECTOR, val);
        }
        else if (scope) {
            exports.SCOPE_PRODIDERS.length && processProviders(this, exports.SCOPE_PRODIDERS);
        }
    }
}
exports.DefaultInjector = DefaultInjector;
injector_1.INJECT_IMPL.createRoot = (providers) => {
    return new DefaultEnvironmentInjector(providers);
};
injector_1.INJECT_IMPL.create = (parent, providers, scope) => {
    if (scope === 'static' || (0, chk_1.isFunction)(scope)) {
        return new StaticInjector(parent, providers, scope);
    }
    return new DefaultInjector(parent, providers, scope);
};
injector_1.INJECT_IMPL.isInjector = (target) => target instanceof AbstractInjector;
/**
 * Inject Util.
 */
var InjectUtil;
(function (InjectUtil) {
    /**
     * set gloabl singleton.
     *
     * 设置标记令牌的实例，并设置为全局单例。
     *
     * @param token provide key
     * @param value singleton vaule
     */
    function setSingleton(injector, token, value) {
        injector.getRuntime().set(token, value, injector);
    }
    InjectUtil.setSingleton = setSingleton;
    function resolve(injector, tokenOrParam, ...args) {
        if (!args.length || (0, chk_1.isUndefined)(args[0]) || (0, chk_1.isNumber)(args[0]) || (0, chk_1.isFunction)(args[0] || args[0] instanceof contexts_1.RunContext)) {
            if ((0, resolver_1.isParameter)(tokenOrParam)) {
                return (0, resolver_1.getResolver)(injector).resolve(tokenOrParam, args[0] ?? (0, contexts_1.createRunContext)(injector));
            }
            else {
                return (0, resolver_1.getResolver)(injector).resolve({ provider: tokenOrParam, flags: args[0] }, (0, contexts_1.createRunContext)(injector));
            }
        }
        assertNotDestroyed(injector);
        const token = tokenOrParam;
        let context;
        const isResolve = true;
        let isCtx = false;
        if (args.length === 1) {
            const arg1 = args[0];
            if (arg1 instanceof contexts_1.RunContext) {
                context = arg1;
                isCtx = true;
            }
            else if ((0, chk_1.isArray)(arg1)) {
                context = arg1.length ? (0, contexts_1.createRunContext)((0, injector_1.createInjector)(injector, { providers: arg1 })) : undefined;
            }
            else if (arg1.provide) {
                context = (0, contexts_1.createRunContext)((0, injector_1.createInjector)(injector, { providers: [arg1] }));
            }
            else if ((0, context_1.hasContextOptions)(arg1)) {
                context = (0, contexts_1.createRunContext)((0, injector_1.createInjector)(injector, { isResolve, ...arg1 }));
            }
        }
        else {
            context = (0, contexts_1.createRunContext)((0, injector_1.createInjector)(injector, { providers: args }));
        }
        const result = injector.get(token, null, tokens_1.InjectFlags.Resolve, context);
        if (context && !isCtx) {
            (0, lang_1.immediate)(() => context.onDestroy());
        }
        return result;
    }
    InjectUtil.resolve = resolve;
    /**
     * set value.
     *
     * 设置标记令牌的实例，并设置为静态值。
     *
     * @param token provide key
     * @param value the vaule provider for the token.
     * @param provider the value type.
     */
    function setValue(injector, token, value, type) {
        assertNotDestroyed(injector);
        const records = injector[injector_1.RECORDS];
        const isp = records.get(token);
        if (isp) {
            isp.value = value;
            if (type)
                isp.type = type;
        }
        else if (!(0, chk_1.isNil)(value)) {
            records.set(token, (0, common_1.createValueRecord)(value));
        }
    }
    InjectUtil.setValue = setValue;
    /**
     * cache token instance.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} cache
     * @param {number} expires cache expires time.
     * @returns {this}
     */
    function cache(injector, token, value, expires) {
        assertNotDestroyed(injector);
        const records = injector[injector_1.RECORDS];
        const pd = records.get(token);
        const ltop = Date.now();
        if (pd) {
            pd.value = value;
            pd.expires = ltop + expires;
        }
        else {
            records.set(token, { value, expires });
        }
    }
    InjectUtil.cache = cache;
    function provider(injector, provider) {
        processProvider(injector, provider);
    }
    InjectUtil.provider = provider;
    function inject(injector, ...args) {
        assertNotDestroyed(injector);
        processProviders(injector, args);
    }
    InjectUtil.inject = inject;
    function use(injector, ...args) {
        const types = [];
        processUse(injector, args, types);
        return types;
    }
    InjectUtil.use = use;
    /**
     * async use modules.
     * @param modules
     */
    async function useAsync(injector, ...args) {
        const types = [];
        await processUse(injector, args, types);
        return types;
    }
    InjectUtil.useAsync = useAsync;
    function register(injector, ...args) {
        assertNotDestroyed(injector);
        (0, lang_1.deepForEach)(args, t => {
            processProvider(injector, t);
        });
    }
    InjectUtil.register = register;
    /**
     * unregister the token
     *
     * 注销标记指令
     * @template T
     * @param {Token<T>} token
     * @returns {this} this self.
     */
    function unregister(injector, token) {
        assertNotDestroyed(injector);
        const records = injector[injector_1.RECORDS];
        const isp = records.get(token);
        if (isp) {
            records.delete(token);
            if (isp.type) {
                const exportProviders = (0, type_def_1.getDef)(isp.type)?.exportProviders;
                if (exportProviders?.length) {
                    exportProviders.forEach(prd => {
                        if ('provide' in prd) {
                            records.delete(prd.provide);
                        }
                        else if ((0, chk_1.isFunction)(prd)) {
                            records.delete(prd);
                        }
                    });
                }
                injector.getRuntime().clearTypeProvider(isp.type);
            }
            (0, lang_1.cleanObj)(isp);
        }
    }
    InjectUtil.unregister = unregister;
    function invoke(injector, target, propertyKey, ...args) {
        assertNotDestroyed(injector);
        let providers;
        let context;
        let option;
        if (args.length === 1) {
            const arg0 = args[0];
            if (arg0 instanceof contexts_1.RunContext) {
                context = arg0;
                providers = [];
            }
            else if ((0, chk_1.isArray)(arg0)) {
                providers = arg0;
            }
            else if ((0, obj_1.isPlainObject)(arg0) && !arg0.provide) {
                option = arg0;
            }
            else {
                providers = args;
            }
        }
        else {
            providers = args;
        }
        let targetClass, instance;
        let tgRefl;
        if (!context) {
            option = { ...option, providers };
            injector = (0, injector_1.createInjector)(injector, option);
        }
        if ((0, obj_1.isTypeObject)(target)) {
            targetClass = (0, type_1.getType)(target);
            instance = target;
        }
        else {
            if (target instanceof class_1.ClassRef) {
                tgRefl = target;
                targetClass = target.type;
            }
            else {
                instance = injector.get(target, context);
                targetClass = (0, type_1.getType)(instance);
                if (!targetClass) {
                    throw new exception_1.Exception(target.toString() + ' is not implements by any class.');
                }
            }
        }
        tgRefl = tgRefl ?? (0, class_1.getClassRef)(targetClass);
        return tgRefl.invoke(tgRefl.getMethodName(propertyKey), injector, instance, context);
    }
    InjectUtil.invoke = invoke;
})(InjectUtil || (exports.InjectUtil = InjectUtil = {}));
function deferProcessProviders(injector, providers, defer) {
    const ret = processProviders(injector, providers);
    if (ret) {
        ret.then(defer.resolve).catch(defer.reject);
    }
    else {
        defer.resolve();
    }
}
function processProviders(injector, providers) {
    if (!providers || !providers.length)
        return;
    return (0, common_1.eachProvider)(providers, p => processProvider(injector, p));
}
function processProvider(injector, provider) {
    const token = (0, chk_1.isFunction)(provider) ? provider : provider.provide;
    if (token) {
        const record = generateRecord(injector, provider);
        if (!(0, chk_1.isFunction)(provider) && provider.multi) {
            let multiPdr = injector[injector_1.RECORDS].get(token);
            if (!multiPdr) {
                multiPdr = (0, common_1.createRecord)(undefined, injector.isStatic, provider.static, true);
                multiPdr.factory = (raise) => (0, common_1.resolveArgs)(raise?.getInjector() ?? injector, multiPdr.multi, raise);
                injector[injector_1.RECORDS].set(token, multiPdr);
            }
            if (multiPdr.multi) {
                const multiOrder = provider.multiOrder;
                if ((0, chk_1.isNumber)(multiOrder)) {
                    multiPdr.multi.splice(multiOrder, 0, record);
                }
                else {
                    multiPdr.multi.push(record);
                }
            }
        }
        else {
            injector[injector_1.RECORDS].set(token, record);
        }
        if (record.onRegister) {
            record.onRegister();
            record.onRegister = undefined;
        }
        provider.onRegistered?.(injector);
    }
    else if (provider.provider) {
        const pdrs = provider.provider(injector);
        if ((0, chk_1.isPromise)(pdrs)) {
            return pdrs.then(ps => {
                ps && processProviders(injector, ps);
            });
        }
        else if (pdrs) {
            processProviders(injector, pdrs);
        }
    }
}
/**
 * generate record.
 * @param injector
 * @param provider
 * @returns
 */
/**
 * 生成提供者记录
 * @param injector 注入器实例
 * @param provider 提供者配置
 * @returns 优化后的提供者记录
 */
function generateRecord(injector, provider) {
    if ((0, providers_1.isTypeProvider)(provider)) {
        return generateTypeRecord(injector, (0, class_1.getClassRef)(provider));
    }
    else {
        let factory;
        if ((0, providers_1.isValueProvider)(provider)) {
            return (0, common_1.createValueRecord)(provider.useValue);
        }
        else if ((0, providers_1.isFactoryProvider)(provider)) {
            factory = (raise) => provider.useFactory(...(0, common_1.resolveArgs)(raise?.getInjector() ?? injector, provider.deps, raise));
        }
        else if ((0, providers_1.isExistingProvider)(provider)) {
            factory = (raise, flags) => (raise?.getInjector() ?? injector).get(provider.useExisting, undefined, flags);
        }
        else if (provider.provide) {
            if (provider.useClass && !provider.deps && injector.has(provider.useClass)) {
                const type = provider.useClass;
                factory = (raise, flags) => (raise?.getInjector() ?? injector).get(type, null, flags, raise);
            }
            else {
                const classType = provider.useClass ?? provider.provide;
                return generateTypeRecord(injector, (0, class_1.getClassRef)(classType), provider.deps, provider.provide, provider.multi);
            }
        }
        return (0, common_1.createRecord)(factory, injector.isStatic, provider.static);
    }
}
function generateTypeRecord(injector, typeRef, params, provide, multi) {
    const { static: decStatic, providedIn, singleton } = typeRef.getAnnotation();
    const origin = injector;
    const runtime = injector.getRuntime();
    if (providedIn) {
        injector = runtime.getInjector(providedIn, injector);
    }
    const isStatic = injector.isStatic;
    const type = typeRef.type;
    const pdrId = origin !== injector;
    if (pdrId && injector.has(typeRef.type)) {
        return (0, common_1.createRecord)((raise, flags) => origin.get(type, undefined, flags), isStatic, decStatic);
    }
    const factory = (runContext) => {
        if (singleton && runtime.has(type)) {
            return runtime.get(type);
        }
        const context = (0, context_2.createRuntimeContext)(injector, undefined, runtime, runContext, multi, params);
        const instance = runtime.getInstanceHandler().handle(typeRef, context, { finally: () => context.onDestroy() });
        if (singleton) {
            runtime.set(type, instance, injector);
        }
        return instance;
    };
    let record;
    if (pdrId) {
        const pdRecord = (0, common_1.createRecord)(factory, isStatic, decStatic);
        if (provide)
            injector[injector_1.RECORDS].set(type, pdRecord);
        record = (0, common_1.createRecord)(() => injector.get(type), isStatic, decStatic);
    }
    else {
        record = (0, common_1.createRecord)(factory, isStatic, decStatic);
        if (provide)
            injector[injector_1.RECORDS].set(type, record);
    }
    record.onRegister = () => {
        const context = (0, context_2.createDesignContext)(injector, undefined, runtime, multi, provide);
        runtime.getRegisterHandler().handle(typeRef, context, { finally: () => context.onDestroy() });
    };
    return record;
}
function register(injector, typeRef) {
    const record = generateTypeRecord(injector, typeRef);
    injector[injector_1.RECORDS].set(typeRef.type, record);
    if (record.onRegister)
        record.onRegister();
}
function processInjectType(injector, typeOrDef, dedupStack, imported, extedOption, moduleRefl) {
    // 提前检查重复处理
    const isFn = (0, chk_1.isFunction)(typeOrDef);
    const type = isFn ? typeOrDef : typeOrDef.module;
    if (dedupStack.includes(type)) {
        return;
    }
    dedupStack.push(type);
    let ps;
    // 处理ModuleWithProviders情况
    if (!isFn && typeOrDef.providers?.length) {
        ps = (0, common_1.eachProvider)(typeOrDef.providers, pdr => processProvider(injector, pdr));
    }
    const typeRef = moduleRefl ?? (0, class_1.getClassRef)(type);
    const annotation = typeRef.getAnnotation();
    if (annotation.module) {
        if (annotation.imports?.length) {
            for (const imp of annotation.imports) {
                ps = (0, common_1.mergePromise)(ps, () => processInjectType(injector, imp, dedupStack, true, extedOption));
            }
        }
        if (annotation.providers) {
            const providers = annotation.providers;
            ps = (0, common_1.mergePromise)(ps, () => (0, common_1.eachProvider)(providers, pdr => processProvider(injector, pdr)));
        }
        const noDecl = !(imported && !(annotation.providedIn === 'root' || annotation.providedIn === 'platform'));
        ps = (0, common_1.mergePromise)(ps, () => processInjectDeclarations(injector, annotation, dedupStack, noDecl));
    }
    if (ps) {
        return ps.then(() => register(injector, typeRef));
    }
    else {
        register(injector, typeRef);
    }
}
function processInjectDeclarations(injector, annotation, dedupStack, declarations, ps) {
    const dps = [];
    if (ps)
        dps.push(ps);
    if (declarations && annotation.declarations?.length) {
        const extedOption = (typeRef, option) => ({ static: false, ...option, declaration: true });
        for (const d of annotation.declarations) {
            const res = processInjectType(injector, d, dedupStack, true, extedOption);
            if (res) {
                dps.push(res);
            }
        }
    }
    if (annotation.exports?.length) {
        const extedOption = (typeRef, option) => typeRef.getAnnotation().module ? option : ({ static: false, ...option, declaration: true });
        for (const d of annotation.exports) {
            const res = processInjectType(injector, d, dedupStack, true, extedOption);
            if (res) {
                dps.push(res);
            }
        }
    }
    if (dps.length)
        return Promise.all(dps);
}
function processUse(injector, args, types) {
    const stk = [];
    return (0, lang_1.deepForEach)(args, (ty) => {
        if ((0, type_1.isType)(ty) && (0, type_def_1.getDef)(ty)?.abstract !== true) {
            types?.push(ty);
            return processInjectType(injector, ty, stk);
        }
        else if ((0, chk_1.isFunction)(ty.module) && (0, chk_1.isArray)(ty.providers)) {
            types?.push(ty.module);
            return processInjectType(injector, ty, stk);
        }
    }, v => (0, obj_1.isPlainObject)(v) && !((0, chk_1.isFunction)(v.module) && (0, chk_1.isArray)(v.providers)));
}
//# sourceMappingURL=injector.js.map