"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultInvocationFactory = exports.AbstractInvocationFactory = exports.DefaultInvocation = exports.AbstractInvocation = void 0;
const context_1 = require("../context");
const invocation_1 = require("../invocation");
const chk_1 = require("../utils/chk");
const type_1 = require("../metadata/type");
const class_1 = require("../metadata/class");
const injector_1 = require("../injector");
const exception_1 = require("../exception");
const tokens_1 = require("../tokens");
const lang_1 = require("../utils/lang");
const compose_1 = require("../handlers/compose");
const contexts_1 = require("../handlers/contexts");
const define_1 = require("../metadata/define");
const common_1 = require("./common");
/**
 * abstract invocation
 * implements {@link Invocation}
 */
class AbstractInvocation extends invocation_1.Invocation {
    constructor(_classRef, injector, options) {
        super();
        this._classRef = _classRef;
        this.injector = injector;
        this.options = options;
        this._isResolve = false;
        this._isResolve = (0, context_1.hasContextOptions)(options);
        this._mthCtx = new Map();
        // Store invocation in context using records directly
        const rvalue = (0, common_1.createValueRecord)(this);
        injector[injector_1.RECORDS].set(invocation_1.Invocation, rvalue);
        injector[injector_1.RECORDS].set((0, type_1.getType)(this), rvalue);
        injector.onDestroy(this);
    }
    get bootstrap() {
        return this.options?.bootstrap != false;
    }
    get type() {
        return this._classRef?.type;
    }
    get classRef() {
        return this._classRef;
    }
    get instance() {
        if (!this._instance) {
            this._instance = this.createInstance();
        }
        return this._instance;
    }
    invoke(arg, optionOrArgs) {
        this.assertNotDestroyed();
        let name;
        let args;
        let rctx;
        let context;
        if ((0, injector_1.isInjector)(arg)) {
            context = arg;
        }
        else if ((0, chk_1.isArray)(arg)) {
            args = arg;
        }
        else if ((0, chk_1.isString)(arg) || (0, chk_1.isSymbol)(arg) || (0, chk_1.isFunction)(arg)) {
            name = (0, chk_1.isFunction)(arg) ? this.classRef.getMethodName(arg) : arg;
            if ((0, chk_1.isArray)(optionOrArgs)) {
                args = optionOrArgs;
            }
            else if (optionOrArgs instanceof contexts_1.RunContext) {
                rctx = optionOrArgs;
            }
            else {
                context = optionOrArgs;
            }
        }
        else if (arg instanceof contexts_1.RunContext) {
            rctx = arg;
        }
        else {
            context = arg;
        }
        if (!name) {
            name = this.options?.propertyKey;
        }
        if (!name) {
            return this.process(context, rctx);
        }
        return this.invokeMethod(name, context, args, rctx);
    }
    invokeMethod(name, options, args, resolveCtx) {
        const [context, destroy, payload] = args ? [this.injector] : this.createInvokeContext(name, options);
        const isNetRCtx = !resolveCtx;
        if (isNetRCtx) {
            resolveCtx = (0, contexts_1.createRunContext)(context);
            if (payload)
                resolveCtx.setPayload(payload);
        }
        else {
            resolveCtx.setInjector(context);
        }
        if (!args) {
            args = this.classRef.resolveArguments(name, context, resolveCtx);
        }
        const result = this.classRef.invoke(name, context, this.instance, args);
        if (destroy || isNetRCtx) {
            const act = isNetRCtx ? () => {
                destroy?.();
                resolveCtx?.onDestroy();
            } : destroy;
            if ((0, chk_1.isPromise)(result)) {
                return result.then(val => {
                    (0, lang_1.immediate)(act);
                    return val;
                });
            }
            else {
                (0, lang_1.immediate)(act);
            }
        }
        return result;
    }
    createInjector(parent, options) {
        return (0, injector_1.createInjector)(parent, options);
    }
    getInjector(propertyKey) {
        if (propertyKey === define_1.ctorName)
            return this.injector;
        let ctx = this._mthCtx.get(propertyKey);
        if (ctx === undefined) {
            const opts = this.classRef.getMethodOptions(propertyKey);
            if ((0, context_1.hasContextOptions)(opts)) {
                ctx = this.createInjector(this.injector, opts);
                this.injector.onDestroy(ctx);
                this._mthCtx.set(propertyKey, ctx);
            }
            else {
                this._mthCtx.set(propertyKey, null);
            }
        }
        return ctx ?? this.injector;
    }
    createInvokeContext(propertyKey, options) {
        const ctx = this.getInjector(propertyKey);
        let context;
        let destroy;
        let payload;
        if ((0, injector_1.isInjector)(options)) {
            // Use the provided context directly
            context = options;
            // No need for ref management - context lifecycle is managed by caller
        }
        else if ((0, context_1.hasContextOptions)(options)) {
            // Create new context with options
            context = this.createInjector(ctx, options);
            payload = options?.payload;
            destroy = () => {
                if (!context.destroyed) {
                    context.destroy();
                }
            };
        }
        else {
            // Use method context directly
            payload = options?.payload;
            context = ctx;
        }
        return [context, destroy, payload];
    }
    createInstance(context) {
        this.assertNotDestroyed();
        if (this.options?.instance) {
            return (0, chk_1.isFunction)(this.options.instance) ? this.options.instance(this.injector) : this.options.instance;
        }
        return this.injector.resolve(this.type, this._isResolve ? tokens_1.InjectFlags.Resolve : undefined, context);
    }
    equals(target) {
        if (!target || !this._classRef)
            return false;
        if (target === this)
            return true;
        if (target?.classRef !== this.classRef)
            return false;
        if (target.options?.propertyKey !== this.options?.propertyKey)
            return false;
        return target.instance !== this._instance;
    }
    /**
     * context destroyed or not.
     */
    get destroyed() {
        return this.injector.destroyed;
    }
    /**
     * destroy this.
     */
    destroy() {
        if (this.destroyed)
            return;
        this.clean();
        return this.injector.destroy();
    }
    clean() {
        // this._tagPdrs = null!;
        this._classRef = null;
        this._instance = null;
        this._mthCtx.clear();
    }
    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    onDestroy(callback) {
        if (!callback) {
            return this.destroy();
        }
        this.injector.onDestroy(callback);
    }
    assertNotDestroyed() {
        if (this.destroyed) {
            throw new exception_1.Exception(`ReflectiveRef of ${this._classRef?.className} has already been destroyed.`);
        }
    }
}
exports.AbstractInvocation = AbstractInvocation;
/**
 * default invocation.
 * extends {@link AbstractInvocation}
 */
class DefaultInvocation extends AbstractInvocation {
    constructor(_classRef, injector, options = {}) {
        super(_classRef, injector, options);
    }
    process(option, resolveCtx) {
        const runnables = this.classRef.runnables.filter(r => !r.auto);
        if (runnables && runnables.length) {
            const handler = (0, compose_1.composeHandlers)(runnables.sort((a, b) => (a.order || 0) - (b.order || 0)).map(runnable => {
                return (option) => this.invokeMethod(runnable.propertyKey, option, undefined, resolveCtx);
            }));
            return handler(this.injector, resolveCtx);
        }
        else {
            throw new exception_1.ArgumentException(this.classRef.className + ' is invaild runnable, can not invocation without method param.');
        }
    }
}
exports.DefaultInvocation = DefaultInvocation;
class AbstractInvocationFactory {
    constructor(runtime) {
        this.runtime = runtime;
    }
    create(type, options) {
        const cls = (0, class_1.getClassify)(type);
        const resolvers = this.mergeResolvers(cls, options);
        const providers = this.mergeProviders(cls, options);
        const context = this.createInjector(cls, this.getInjector(cls, options), {
            ...options,
            providers,
            resolvers,
            targetType: cls.type
        });
        return this.createInstance(cls, context, options);
    }
    createInjector(typeRef, injector, options) {
        return (0, injector_1.createInjector)(injector, options, typeRef.type);
    }
    mergeProviders(typeRef, options) {
        const providers = [];
        const typeProviders = this.runtime.getTypeProvider(typeRef);
        if (typeProviders) {
            providers.push(...typeProviders);
        }
        if (options?.providers) {
            providers.push(...options.providers);
        }
        return providers;
    }
    mergeResolvers(typeRef, options) {
        let resolvers = options?.resolvers;
        if (resolvers) {
            if (typeRef.resolvers)
                resolvers = resolvers.concat(typeRef.resolvers);
        }
        else {
            resolvers = typeRef.resolvers.slice(0);
        }
        return resolvers;
    }
    getInjector(typeRef, options) {
        return options?.injector ?? this.runtime.getRegisterIn(typeRef.type);
    }
}
exports.AbstractInvocationFactory = AbstractInvocationFactory;
class DefaultInvocationFactory extends AbstractInvocationFactory {
    createInstance(typeRef, context, options) {
        return new DefaultInvocation(typeRef, context, options);
    }
}
exports.DefaultInvocationFactory = DefaultInvocationFactory;
//# sourceMappingURL=invocation.js.map