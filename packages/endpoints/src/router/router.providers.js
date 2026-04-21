"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROUTERS = exports.MESSAGE_ROUTERS = exports.ROUTER_PREFIX = void 0;
exports.getRouter = getRouter;
exports.createRouteProviders = createRouteProviders;
const ioc_1 = require("@tsdi/ioc");
const common_1 = require("@tsdi/common");
const common_2 = require("@tsdi/common");
const router_optimize_1 = require("./router.optimize");
const tokens_1 = require("../tokens");
/**
 * global router prefix.
 */
exports.ROUTER_PREFIX = (0, ioc_1.token)('ROUTER_PREFIX');
/**
 * microservice message routers.
 */
exports.MESSAGE_ROUTERS = (0, ioc_1.token)('MESSAGE_ROUTERS');
/**
 *  service routers.
 */
exports.ROUTERS = (0, ioc_1.token)('ROUTERS');
function getRouter(injector, transport, microservice) {
    const routers = injector.get(microservice ? exports.MESSAGE_ROUTERS : exports.ROUTERS, null);
    if (!routers)
        throw new common_2.InternalServerException(`${transport ? common_1.Transport[transport] : ''} ${microservice ? 'micro' : ''}service router has not register.`);
    // if (!transport && routers.length > 1) throw new InternalServerException(`has mutil ${microservice ? 'micro' : ''}service, protocol param can not empty`);
    const router = routers.find(r => r.transport == transport) ?? routers.find(r => r.asDefault) ?? routers[0];
    if (!router)
        throw new common_2.InternalServerException(`${transport ?? ''} ${microservice ? 'micro' : ''}service router has not register.`);
    return router;
}
function createRouteProviders(config, token, optsify = {}, asDefault) {
    token ?? (token = (0, tokens_1.getRouterToken)(config));
    return [
        {
            provide: token,
            useFactory: (injector) => {
                const opts = (0, ioc_1.isFunction)(optsify) ? optsify(injector) : optsify;
                return new router_optimize_1.OptimizedRouter(injector, opts.formatter ? ((0, ioc_1.isType)(opts.formatter) ? injector.get(opts.formatter) : opts.formatter) : injector.get(common_1.PatternFormatter, common_1.defaultFormatter), opts.prefix, config.transport, opts.options, opts.routes, config.microservice);
            },
            deps: [ioc_1.Injector],
        },
        {
            provide: config.microservice ? exports.MESSAGE_ROUTERS : exports.ROUTERS,
            useExisting: token,
            multi: true
        }
    ];
}
//# sourceMappingURL=router.providers.js.map