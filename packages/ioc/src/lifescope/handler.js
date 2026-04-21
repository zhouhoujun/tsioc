"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeHandler = void 0;
const compose_1 = require("../handlers/compose");
const chk_1 = require("../utils/chk");
/**
 * runtime handler.
 */
class RuntimeHandler {
    constructor(backend, interceptors) {
        if ((0, chk_1.isFunction)(backend)) {
            this.backend = backend;
        }
        else {
            this.backend = (req, ctx) => backend.handle(req, ctx);
        }
        this.interceptors = interceptors?.slice(0) ?? [];
    }
    /**
     * use interceptor for the handler.
     * @param interceptor
     * @param order
     * @returns
     */
    use(interceptors, order) {
        const iterceps = Array.isArray(interceptors) ? interceptors : [interceptors];
        if ((0, chk_1.isNumber)(order)) {
            this.interceptors.splice(order, 0, ...iterceps);
        }
        else {
            this.interceptors.push(...iterceps);
        }
        this.reset();
        return this;
    }
    getIndexOf(interceptor) {
        return this.interceptors.indexOf(interceptor);
    }
    handle(input, context, tail) {
        if (!this.chain) {
            this.chain = this.compose();
        }
        return tail ? (0, compose_1.invokeTail)(this.chain, tail, input, this.backend, context) : this.chain(input, this.backend, context);
    }
    reset() {
        this.chain = null;
    }
    compose() {
        return (0, compose_1.composeInterceptors)(this.interceptors);
    }
}
exports.RuntimeHandler = RuntimeHandler;
//# sourceMappingURL=handler.js.map