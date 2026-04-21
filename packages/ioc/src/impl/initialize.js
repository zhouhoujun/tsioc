"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INITIALIZE_INTERCEPTORS = exports.instanceHandler = exports.ctorArgsInterceptor = exports.propertyInterceptor = exports.methodInterceptor = exports.cacheInterceptor = exports.runtimeAnnoInterceptor = exports.runtimeAutorunInterceptor = void 0;
exports.getRuntimeClassScope = getRuntimeClassScope;
exports.getRuntimeMethodScope = getRuntimeMethodScope;
exports.getRuntimePropertyScope = getRuntimePropertyScope;
const exception_1 = require("../exception");
const context_1 = require("../context");
const contexts_1 = require("../handlers/contexts");
const define_1 = require("../metadata/define");
const handler_1 = require("../lifescope/handler");
const injector_1 = require("./injector");
const chk_1 = require("../utils/chk");
const common_1 = require("./common");
const resolver_1 = require("../resolver");
const compose_1 = require("../handlers/compose");
const runtimeAutorunInterceptor = (input, next, context) => {
    return (0, compose_1.invokeTail)(next, (instance) => {
        const autos = input.runnables.filter(c => c.auto && c.decorType === define_1.Decors.method);
        if (autos.length) {
            // const { injector, classRef: def, instance, context } = input;
            const injector = context.raiseInjector;
            const invocation = input.createInvocation(injector, { instance });
            for (const aut of autos) {
                invocation.invoke(aut.propertyKey);
            }
        }
        return instance;
    }, input, context);
};
exports.runtimeAutorunInterceptor = runtimeAutorunInterceptor;
const RUNTIME_CLASS_SCOPE = new context_1.ContextToken(() => null);
const runtimeAnnoInterceptor = (input, next, context) => {
    return (0, compose_1.invokeTail)(next, (instance) => {
        getRuntimeClassScope(context.runtime).handle(input, context);
        return instance;
    }, input, context);
};
exports.runtimeAnnoInterceptor = runtimeAnnoInterceptor;
function invokeRuntimeHandler(decors, ctx, scope, context) {
    if (!decors || decors.length < 1) {
        return;
    }
    for (const d of decors) {
        context.currDecor = d;
        d.getRuntimeHandler?.(scope)?.(ctx, context);
    }
}
function getRuntimeClassScope(runtime) {
    let scope = runtime.get(RUNTIME_CLASS_SCOPE);
    if (!scope) {
        scope = new handler_1.RuntimeHandler((input, context) => {
            invokeRuntimeHandler(input.classDecors, input, define_1.Decors.CLASS, context);
        });
        runtime.set(RUNTIME_CLASS_SCOPE, scope);
    }
    return scope;
}
const cacheInterceptor = (input, next, context) => {
    return (0, compose_1.invokeTail)(next, (instance) => {
        const ann = input.getAnnotation();
        if (!ann.singleton && (ann.expires && ann.expires > 0)) {
            const injector = context.raiseInjector;
            injector_1.InjectUtil.cache(injector, input.type, instance, ann.expires);
        }
        return instance;
    }, input, context);
};
exports.cacheInterceptor = cacheInterceptor;
const methodInterceptor = (input, next, context) => {
    return (0, compose_1.invokeTail)(next, (instance) => {
        return getRuntimeMethodScope(context.runtime).handle(input, context, () => instance);
    }, input, context);
};
exports.methodInterceptor = methodInterceptor;
const RUNTIME_METHOD_SCOPE = new context_1.ContextToken(() => null);
function getRuntimeMethodScope(runtime) {
    let scope = runtime.get(RUNTIME_METHOD_SCOPE);
    if (!scope) {
        scope = new handler_1.RuntimeHandler((input, context) => {
            invokeRuntimeHandler(input.methodDecors, input, define_1.Decors.method, context);
        });
        runtime.set(RUNTIME_METHOD_SCOPE, scope);
    }
    return scope;
}
const propertyInterceptor = (input, next, context) => {
    return (0, compose_1.invokeTail)(next, (instance) => {
        const injector = context.raiseInjector;
        if (!instance)
            throw new exception_1.Exception('autowride property need instance');
        let meta, key, val;
        // const rctx = context.as(ResolveContext)
        //     .setInjector(injector);
        const rctx = context.has(contexts_1.RunContext) ? context.get(contexts_1.RunContext) : (0, contexts_1.createRunContext)(injector, context); // context.as(RunContext).setInjector(injector);
        const resolver = (0, resolver_1.getResolver)(injector);
        input.eachPropertyProviders((metas, propertyKey) => {
            meta = metas.find(m => m.type || m.provider);
            if (!meta)
                return;
            key = `${propertyKey.toString()}_INJECTED`;
            if (!context.has(key)) {
                val = resolver.resolve(meta, rctx);
                if ((0, chk_1.isDefined)(val)) {
                    instance[propertyKey] = val;
                    context.set(key, val);
                }
            }
        });
        // rctx.onDestroy();
        return getRuntimePropertyScope(context.runtime).handle(input, context, () => instance);
    }, input, context);
};
exports.propertyInterceptor = propertyInterceptor;
const RUNTIME_PROPERTY_SCOPE = new context_1.ContextToken(() => null);
function getRuntimePropertyScope(runtime) {
    let scope = runtime.get(RUNTIME_PROPERTY_SCOPE);
    if (!scope) {
        scope = new handler_1.RuntimeHandler((input, context) => {
            invokeRuntimeHandler(input.propDecors, input, define_1.Decors.property, context);
        });
        runtime.set(RUNTIME_PROPERTY_SCOPE, scope);
    }
    return scope;
}
/**
 * resolve constructor args action.
 */
const ctorArgsInterceptor = (input, next, context) => {
    if (!context.args) {
        const injector = context.raiseInjector;
        const resolver = (0, resolver_1.getResolver)(injector);
        const rctx = context.has(contexts_1.RunContext) ? context.get(contexts_1.RunContext) : (0, contexts_1.createRunContext)(injector, context); //context.as(RunContext).setInjector(injector);
        const args = context.params ? (0, common_1.resolveArgs)(injector, context.params, rctx, resolver)
            : (0, common_1.resolveParameters)(injector, input.getParameters(define_1.ctorName), rctx, resolver);
        context.args = args;
        // rctx.onDestroy();
    }
    return next(input, context);
};
exports.ctorArgsInterceptor = ctorArgsInterceptor;
const instanceHandler = (typeRef, context) => {
    const args = context.args ?? [];
    const instance = new typeRef.type(...args);
    context.instance = instance;
    return instance;
};
exports.instanceHandler = instanceHandler;
exports.INITIALIZE_INTERCEPTORS = [
    // cleanContextInterceptor,
    exports.runtimeAutorunInterceptor,
    exports.runtimeAnnoInterceptor,
    exports.cacheInterceptor,
    // singletonInterceptor,
    exports.methodInterceptor,
    exports.propertyInterceptor,
    exports.ctorArgsInterceptor
];
//# sourceMappingURL=initialize.js.map