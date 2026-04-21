"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeContext = exports.IocContext = void 0;
exports.createDesignContext = createDesignContext;
exports.createRuntimeContext = createRuntimeContext;
const context_1 = require("../context");
const contexts_1 = require("../handlers/contexts");
const runtime_1 = require("../runtime");
const CURR_DECOR = new context_1.ContextToken(() => null);
const INJECTOR = new context_1.ContextToken(() => null);
const RAISE_INJECTOR = new context_1.ContextToken(() => null);
const PROVIDE = new context_1.ContextToken(() => null);
const CTOR_ARGS = new context_1.ContextToken(() => null);
const CTOR_PARAMS = new context_1.ContextToken(() => null);
const INSTANCE = new context_1.ContextToken(() => null);
const MUTIL = new context_1.ContextToken(() => false);
class IocContext extends contexts_1.DefaultContext {
    get runtime() {
        return this.get(runtime_1.Runtime);
    }
    get injector() {
        return this.get(INJECTOR);
    }
    /**
     * the token to provide.
     */
    get provide() {
        return this.get(PROVIDE);
    }
    /**
     * whether the context is mutil.
     */
    get isMutil() {
        return this.get(MUTIL);
    }
    get currDecor() {
        return this.get(CURR_DECOR);
    }
    set currDecor(value) {
        this.set(CURR_DECOR, value);
    }
}
exports.IocContext = IocContext;
class RuntimeContext extends IocContext {
    /**
     * raise injector
     */
    get raiseInjector() {
        return this.get(RAISE_INJECTOR);
    }
    /**
     * constructor parameters.
     */
    get params() {
        return this.get(CTOR_PARAMS);
    }
    /**
     * constructor arguments.
     */
    get args() {
        return this.get(CTOR_ARGS);
    }
    set args(value) {
        this.set(CTOR_ARGS, value);
    }
    get instance() {
        return this.get(INSTANCE);
    }
    set instance(value) {
        this.set(INSTANCE, value);
    }
}
exports.RuntimeContext = RuntimeContext;
function createDesignContext(injector, previous, runtime, multi, provide) {
    const context = new IocContext(previous);
    context.set(INJECTOR, injector);
    if (!context.has(runtime_1.Runtime))
        context.set(runtime_1.Runtime, runtime ?? injector.getRuntime());
    if (multi)
        context.set(MUTIL, true);
    if (!multi && provide) {
        context.set(PROVIDE, provide);
    }
    return context;
}
function createRuntimeContext(injector, previous, runtime, runContext, multi, params) {
    const context = new RuntimeContext(previous);
    const rt = runtime ?? injector.getRuntime();
    context.set(INJECTOR, injector);
    context.set(runtime_1.Runtime, rt);
    context.set(RAISE_INJECTOR, runContext?.getInjector() || injector);
    if (runContext) {
        context.set(contexts_1.RunContext, runContext);
    }
    if (multi) {
        context.set(MUTIL, true);
    }
    if (params) {
        context.set(CTOR_PARAMS, params);
    }
    return context;
}
//# sourceMappingURL=context.js.map