"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultInvocationHandler = void 0;
exports.createInvocationHandler = createInvocationHandler;
const ioc_1 = require("@tsdi/ioc");
const invocation_1 = require("../invocation");
const configable_impl_1 = require("../handlers/configable.impl");
const ResultValue_1 = require("../handlers/ResultValue");
class DefaultInvocationHandler extends configable_impl_1.ConfigableHandler {
    constructor(invocation, options, propertyKey) {
        super(propertyKey ? invocation.getInjector(propertyKey) : invocation.injector, options);
        this.invocation = invocation;
        this.options = options;
        this.propertyKey = propertyKey;
        this.limit = options.limit;
    }
    getBackend() {
        return (input, context) => this.respond(input, context);
    }
    /**
     * before `Invocation` invoke
     * @param ctx
     */
    beforeInvoke(ctx) { }
    /**
     * respond.
     * @param input
     * @returns
     */
    respond(input, context) {
        if ((0, ioc_1.isNumber)(this.limit)) {
            if (this.limit < 1)
                return null;
            this.limit -= 1;
        }
        return (0, ioc_1.invokeTails)(() => this.beforeInvoke(input), () => {
            const ctx = context.setPayload(input);
            return this.propertyKey ? this.invocation.invoke(this.propertyKey, ctx) : this.invocation.invoke(ctx);
        }, (res) => {
            if (res instanceof ResultValue_1.ResultValue) {
                return res.sendValue(context);
            }
            return this.respondAs(input, res, context);
        });
    }
    /**
     * respond as
     * @param ctx
     * @param res
     * @returns
     */
    respondAs(input, res, context) {
        if ((0, ioc_1.isString)(this.options.response)) {
            const trespond = this.injector.get(invocation_1.TypedRespond);
            if (trespond) {
                return trespond.respond(input, res, this.options.response, context);
            }
        }
        else if (this.options.response) {
            if ((0, ioc_1.isType)(this.options.response)) {
                const respodor = this.injector.get(this.options.response);
                if (respodor)
                    return respodor.respond(input, res, context);
            }
            else if ((0, ioc_1.isFunction)(this.options.response)) {
                return this.options.response(input, res, context);
            }
            return res;
        }
        return res;
    }
    // protected defaultRespond(input: TInput, res: any, context: TContext): void { }
    equals(other) {
        return this.invocation.type === other.invocation.type
            && this.injector === other.injector
            && this.options.response === other.options.response
            && this.propertyKey === other.propertyKey;
    }
}
exports.DefaultInvocationHandler = DefaultInvocationHandler;
function createInvocationHandler(invocation, options, propertyKey, type) {
    const Hanlder = type ?? DefaultInvocationHandler;
    (0, configable_impl_1.normalizeConfigableHandlerOptions)(options);
    return new Hanlder(invocation, options, propertyKey);
}
//# sourceMappingURL=invocation.js.map