"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteHandlerImpl = void 0;
exports.pathInterceptor = pathInterceptor;
exports.createRouteHandler = createRouteHandler;
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
const common_1 = require("@tsdi/common");
const rxjs_1 = require("rxjs");
const route_handler_1 = require("../router/route.handler");
class RouteHandlerImpl extends route_handler_1.RouteHandler {
    constructor(invocation, options, propertyKey) {
        super(invocation, normalizeRouteOptions(invocation, options, propertyKey), propertyKey);
        this.options = options;
        this.route = options.path;
    }
    // protected override defaultRespond(ctx: TInput, res: any): void {
    //     if (ctx instanceof AbstractRequestContext) {
    //         ctx.body = res;
    //     }
    // }
    forbiddenError() {
        return new common_1.ForbiddenException();
    }
}
exports.RouteHandlerImpl = RouteHandlerImpl;
function pathInterceptor(invocation, route) {
    return (input, next, ctx) => {
        if (route.paths && input.request.paths) {
            if (Object.entries(route.paths).some(([key, value]) => {
                const filters = invocation.injector.get(value, []);
                return !filters.length || !filters.includes(input.request.paths[key]);
            })) {
                return (0, rxjs_1.throwError)(() => new common_1.NotFoundException());
            }
        }
        return next(input, ctx);
    };
}
function normalizeRouteOptions(invocation, options, propertyKey) {
    if (options.interceptors || options.paths) {
        if (!options.interceptorsToken) {
            options.interceptorsToken = (0, ioc_1.getToken)(invocation.type, (propertyKey?.toString() || ''));
        }
        if (options.paths) {
            options.interceptors = options.interceptors || [];
            options.interceptors.unshift(pathInterceptor(invocation, options));
        }
    }
    return options;
}
function createRouteHandler(invocation, options, propertyKey, type) {
    const Hanlder = type ?? RouteHandlerImpl;
    (0, core_1.normalizeConfigableHandlerOptions)(options);
    return new Hanlder(invocation, options, propertyKey);
}
//# sourceMappingURL=route.handler.js.map