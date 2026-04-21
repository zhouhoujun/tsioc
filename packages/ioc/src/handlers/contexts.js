"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunContext = exports.DefaultContext = void 0;
exports.createRunContext = createRunContext;
const injector_1 = require("../injector");
const type_1 = require("../metadata/type");
const tokens_1 = require("../tokens");
const chk_1 = require("../utils/chk");
const context_1 = require("../context");
class DefaultContext extends context_1.Context {
    constructor(contextOrEntries, entries, inherit = true) {
        super();
        if (contextOrEntries instanceof context_1.Context) {
            if (inherit) {
                this._parent = contextOrEntries;
                this.map = new Map(entries);
            }
            else {
                this.map = new Map(contextOrEntries.map);
                if (entries) {
                    for (const [k, v] of entries) {
                        this.map.set(k, v);
                    }
                }
            }
        }
        else {
            this.map = new Map(contextOrEntries);
        }
        this._type = (0, type_1.getType)(this);
        this.map.set(this._type, this);
    }
    /**
     * Store a value in the context. If a value is already present it will be overwritten.
     *
     * @param token The reference to an instance of `Token`.
     * @param value The value to store.
     *
     * @returns A reference to itself for easy chaining.
     */
    set(token, value) {
        this.map.set(token, value);
        return this;
    }
    /**
     * Retrieve the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns The stored value or default if one is defined.
     */
    get(token, flags = tokens_1.InjectFlags.Default) {
        if (!(flags & (tokens_1.InjectFlags.SkipSelf | tokens_1.InjectFlags.Host))) {
            const val = this.map.get(token);
            if (val !== undefined || this.map.has(token))
                return val;
            const resolved = this.getTokenValue(token, flags);
            if (!(0, chk_1.isNil)(resolved)) {
                this.set(token, resolved);
                return resolved;
            }
        }
        if (this._parent && !(flags & tokens_1.InjectFlags.Self)) {
            return this._parent.get(token, flags);
        }
        if (token instanceof context_1.ContextToken) {
            const val = token.defaultValue();
            this.set(token, val);
            return val;
        }
        return null;
    }
    getTokenValue(_token, _flags) {
        return null;
    }
    /**
     * Delete the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns A reference to itself for easy chaining.
     */
    delete(token) {
        this.map.delete(token);
        return this;
    }
    /**
     * Checks for existence of a given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns True if the token exists, false otherwise.
     */
    has(token, flags = tokens_1.InjectFlags.Default) {
        if (!(flags & tokens_1.InjectFlags.SkipSelf) && this.map.has(token))
            return true;
        if (this._parent && !(flags & tokens_1.InjectFlags.Self))
            return this._parent.has(token, flags);
        return false;
    }
    // protected hasTokenValue<T>(token: Token<T> | ContextToken<T>, flags: InjectFlags): boolean {
    //     return false;
    // }
    /**
     * Cast the context to the given type.
     * @param type
     * @returns
     */
    as(type, entries) {
        let context = this.get(type);
        if (!context) {
            context = new type(this, entries);
            this.set(type, context);
        }
        else if (entries) {
            for (const [k, v] of entries) {
                context.set(k, v);
            }
        }
        return context;
    }
    clear() {
        this.map.clear();
    }
    /**
     * Lifecycle hook called when the context is destroyed.
     */
    onDestroy() {
        this.clear();
        // this.map = null!;
    }
}
exports.DefaultContext = DefaultContext;
const PAYLOAD = new context_1.ContextToken(() => null);
const RUN_FAILED = new context_1.ContextToken(() => null);
/**
 * RunContext - Optimized context for runtime execution.
 *
 * Combines Context with Injector for efficient data passing during method invocation.
 * Avoids creating full InvocationContext instances when only runtime data is needed.
 *
 * 运行时上下文 - 优化的运行时执行上下文。
 * 结合 Context 和 Injector，在方法调用期间高效传递数据。
 * 当只需要运行时数据时，避免创建完整的 InvocationContext 实例。
 */
class RunContext extends DefaultContext {
    getInjector() {
        let inj = this._injector;
        if (!inj) {
            inj = this.get(injector_1.Injector);
            this._injector = inj;
        }
        return inj;
    }
    setInjector(injector) {
        this._injector = injector;
        return this.set(injector_1.Injector, injector);
    }
    getPayload() {
        return this.get(PAYLOAD);
    }
    setPayload(payload) {
        this.set(PAYLOAD, payload);
        return this;
    }
    getTokenValue(token, flags) {
        if (token instanceof context_1.ContextToken)
            return null;
        return this.getInjector().get(token, null, flags);
    }
    getFailed() {
        return this.get(RUN_FAILED);
    }
}
exports.RunContext = RunContext;
function createRunContext(injector, previous, entries) {
    const context = new RunContext(previous ?? entries, entries);
    context.setInjector(injector);
    return context;
}
//# sourceMappingURL=contexts.js.map