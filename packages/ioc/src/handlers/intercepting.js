"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComposeInterceptor = exports.InterceptingHandler = void 0;
const chk_1 = require("../utils/chk");
const compose_1 = require("./compose");
/**
 * intercepting hnalder.
 */
class InterceptingHandler {
    constructor(backend, interceptors) {
        this.interceptors = interceptors;
        if ((0, chk_1.isFunction)(backend)) {
            this.backend = backend;
        }
        else {
            this.backend = (req, ctx) => backend.handle(req, ctx);
        }
    }
    handle(input, context, tail) {
        if (!this.chain) {
            this.chain = this.compose();
        }
        return tail ? (0, compose_1.invokeTail)(() => this.chain(input, this.backend, context), tail) : this.chain(input, this.backend, context);
    }
    reset() {
        this.chain = null;
    }
    compose() {
        return (0, compose_1.composeInterceptors)((0, chk_1.isFunction)(this.interceptors) ? this.interceptors() : this.interceptors);
    }
}
exports.InterceptingHandler = InterceptingHandler;
/**
 * compose interceptor.
 */
class ComposeInterceptor {
    constructor(interceptors) {
        this.interceptors = interceptors;
    }
    intercept(input, next, context) {
        if (!this.chain) {
            this.chain = this.compose();
        }
        return this.chain(input, (0, compose_1.toHandlerFn)(next), context);
    }
    reset() {
        this.chain = null;
    }
    compose() {
        return (0, compose_1.composeInterceptors)(this.interceptors);
    }
}
exports.ComposeInterceptor = ComposeInterceptor;
//# sourceMappingURL=intercepting.js.map