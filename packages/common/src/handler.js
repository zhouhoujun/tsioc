"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultRequestHandler = exports.ConfigableRequestHandler = exports.RequestInterceptingHandler = void 0;
exports.createRequestHandler = createRequestHandler;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
const rxjs_1 = require("rxjs");
const exceptions_1 = require("./exceptions");
const transfer_1 = require("./transfer");
/**
 * Request intercepting handler.
 */
class RequestInterceptingHandler extends ioc_1.InterceptingHandler {
}
exports.RequestInterceptingHandler = RequestInterceptingHandler;
/**
 * configable request handler.
 */
let ConfigableRequestHandler = class ConfigableRequestHandler extends core_1.AbstractConfigableHandler {
};
exports.ConfigableRequestHandler = ConfigableRequestHandler;
exports.ConfigableRequestHandler = ConfigableRequestHandler = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], ConfigableRequestHandler);
/**
 * Request handler.
 *
 * 传输节点
 */
class DefaultRequestHandler extends core_1.ConfigableHandler {
    append(options) {
        super.append(options);
        const config = options;
        if (config.transfers) {
            this.regMulti(config.transfersToken, config.transfers);
            this.resetChain();
        }
        return this;
    }
    handle(input, context) {
        return (0, rxjs_1.defer)(() => this.canHandle(input, context))
            .pipe((0, rxjs_1.mergeMap)(r => {
            if (r === true)
                return this.run(input, context);
            return (0, rxjs_1.throwError)(() => this.forbiddenError());
        }));
    }
    generateInterceptorFn(fns) {
        const options = this.options;
        if (options.side === transfer_1.TransferSide.server) {
            const transfers = this.injector.get(options.transfersToken);
            if (transfers?.length) {
                fns.unshift(...transfers);
            }
        }
        return (0, ioc_1.composeInterceptors)(fns);
    }
    generateBackendFn() {
        const handler = super.generateBackendFn();
        const options = this.options;
        if (options.side === transfer_1.TransferSide.client) {
            const transfers = this.injector.get(options.transfersToken);
            if (transfers?.length) {
                const interceptorFn = (0, ioc_1.composeInterceptors)(transfers);
                return (req, context) => interceptorFn(req, handler, context);
            }
        }
        return handler;
    }
    forbiddenError() {
        return new exceptions_1.ForbiddenException();
    }
}
exports.DefaultRequestHandler = DefaultRequestHandler;
/**
 * create request handler.
 *
 * 创建传输节点处理器实例化对象
 * @param context
 * @param options
 * @returns
 */
function createRequestHandler(injector, options) {
    (0, core_1.normalizeConfigableHandlerOptions)(options);
    options.enableTypeChain ?? (options.enableTypeChain = true);
    const Type = options.handlerType ?? DefaultRequestHandler;
    return new Type((0, ioc_1.createInjector)(injector, options, options.handlerType), options);
}
//# sourceMappingURL=handler.js.map