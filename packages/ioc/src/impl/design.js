"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DESIGN_INTERECPTORS = exports.exportsInterceptor = exports.dependencyInterceptor = exports.beforeAnnoactionInterceptor = exports.afterAnnoationInterceptor = exports.afterMethodAnnoationInterceptor = exports.afterPropertyAnnoationInterceptor = exports.autorunInterceptor = void 0;
exports.getDesignBeforeAnnoationScope = getDesignBeforeAnnoationScope;
exports.getDesignAfterAnnoationScope = getDesignAfterAnnoationScope;
exports.getDesignPropertyScope = getDesignPropertyScope;
exports.getDesignMethodScope = getDesignMethodScope;
const context_1 = require("../context");
const compose_1 = require("../handlers/compose");
const injector_1 = require("../injector");
const define_1 = require("../metadata/define");
const injector_2 = require("./injector");
const handler_1 = require("../lifescope/handler");
const chk_1 = require("../utils/chk");
const common_1 = require("./common");
const autorunInterceptor = (input, next, context) => {
    return (0, compose_1.invokeTail)(next, (res) => {
        const runs = input.runnables.filter(c => c.auto && c.decorType === define_1.Decors.CLASS);
        if (runs.length < 1) {
            return;
        }
        const invocation = input.createInvocation(context.injector);
        for (const meta of runs) {
            invocation.invoke(meta.propertyKey);
        }
    }, input, context);
};
exports.autorunInterceptor = autorunInterceptor;
function invokeHandler(decors, input, scope, context) {
    if (!decors || decors.length < 1) {
        return;
    }
    for (let i = 0, len = decors.length; i < len; i++) {
        const d = decors[i];
        context.currDecor = d;
        d.getDesignHandler?.(scope)?.(input, context);
    }
}
const BEFORE_ANNOATION_SCOPE = new context_1.ContextToken(() => null);
function getDesignBeforeAnnoationScope(runtime) {
    let scope = runtime.get(BEFORE_ANNOATION_SCOPE);
    if (!scope) {
        scope = new handler_1.RuntimeHandler((input, context) => {
            invokeHandler(input.classDecors, input, define_1.Decors.beforeAnnoation, context);
        });
        runtime.set(BEFORE_ANNOATION_SCOPE, scope);
    }
    return scope;
}
const AFTER_ANNOATION_SCOPE = new context_1.ContextToken(() => null);
function getDesignAfterAnnoationScope(runtime) {
    let scope = runtime.get(AFTER_ANNOATION_SCOPE);
    if (!scope) {
        scope = new handler_1.RuntimeHandler((input, context) => {
            invokeHandler(input.classDecors, input, define_1.Decors.afterAnnoation, context);
        });
        runtime.set(AFTER_ANNOATION_SCOPE, scope);
    }
    return scope;
}
/**
 * property decorator scope.
 */
const DESIGN_PROPERTY_SCOPE = new context_1.ContextToken(() => null);
function getDesignPropertyScope(runtime) {
    let scope = runtime.get(DESIGN_PROPERTY_SCOPE);
    if (!scope) {
        scope = new handler_1.RuntimeHandler((input, context) => {
            invokeHandler(input.propDecors, input, define_1.Decors.property, context);
        });
        runtime.set(DESIGN_PROPERTY_SCOPE, scope);
    }
    return scope;
}
const DESIGN_METHOD_SCOPE = new context_1.ContextToken(() => null);
function getDesignMethodScope(runtime) {
    let scope = runtime.get(DESIGN_METHOD_SCOPE);
    if (!scope) {
        scope = new handler_1.RuntimeHandler((input, context) => {
            invokeHandler(input.methodDecors, input, define_1.Decors.method, context);
        });
        runtime.set(DESIGN_METHOD_SCOPE, scope);
    }
    return scope;
}
const afterPropertyAnnoationInterceptor = (input, next, context) => {
    return (0, compose_1.invokeTail)(next, (res) => {
        getDesignPropertyScope(context.runtime).handle(input, context);
        return res;
    }, input, context);
};
exports.afterPropertyAnnoationInterceptor = afterPropertyAnnoationInterceptor;
const afterMethodAnnoationInterceptor = (input, next, context) => {
    return (0, compose_1.invokeTail)(next, (res) => {
        getDesignMethodScope(context.runtime).handle(input, context);
        return res;
    }, input, context);
};
exports.afterMethodAnnoationInterceptor = afterMethodAnnoationInterceptor;
const afterAnnoationInterceptor = (input, next, context) => {
    return (0, compose_1.invokeTail)(next, (res) => {
        getDesignAfterAnnoationScope(context.runtime).handle(input, context);
        return res;
    }, input, context);
};
exports.afterAnnoationInterceptor = afterAnnoationInterceptor;
const beforeAnnoactionInterceptor = (input, next, context) => {
    return (0, compose_1.invokeTail)(() => getDesignBeforeAnnoationScope(context.runtime).handle(input, context), () => next(input, context));
};
exports.beforeAnnoactionInterceptor = beforeAnnoactionInterceptor;
const dependencyInterceptor = (input, next, context) => {
    const type = input.type;
    const injector = context.injector;
    const provide = context.provide;
    if (provide && provide !== type) {
        const pType = input.getAnnotation().providedIn;
        if (!context.isMutil && (0, chk_1.isFunction)(pType)) {
            const runtime = injector.getRuntime();
            const prd = { provide, useExisting: type };
            runtime.setTypeProvider(pType, prd);
            injector.onDestroy(() => {
                runtime.removeTypeProvider(pType, prd);
            });
        }
    }
    if (input.provides.length) {
        const factory = () => injector.get(type);
        const records = injector[injector_1.RECORDS];
        for (const pdr of input.provides) {
            if (provide != pdr && (context.isMutil ? !records.has(pdr) : true)) {
                records.set(pdr, (0, common_1.createRecord)(factory, injector.isStatic, input.getAnnotation().static));
            }
        }
    }
    return next(input, context);
};
exports.dependencyInterceptor = dependencyInterceptor;
const exportsInterceptor = (input, next, context) => {
    const { exportProviders } = input.getAnnotation();
    if (exportProviders.length) {
        injector_2.InjectUtil.inject(context.injector, exportProviders);
    }
    return next(input, context);
};
exports.exportsInterceptor = exportsInterceptor;
exports.DESIGN_INTERECPTORS = [
    exports.autorunInterceptor,
    exports.afterAnnoationInterceptor,
    exports.afterMethodAnnoationInterceptor,
    exports.afterPropertyAnnoationInterceptor,
    exports.beforeAnnoactionInterceptor,
    exports.dependencyInterceptor,
    exports.exportsInterceptor,
];
//# sourceMappingURL=design.js.map