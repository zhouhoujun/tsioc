"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Put = exports.Post = exports.Patch = exports.Delete = exports.Get = exports.Options = exports.Head = exports.RestController = exports.Controller = exports.RequestBody = exports.RequestParam = exports.RequestPath = exports.RequestHeader = exports.RouteMapping = exports.Handle = exports.Subscribe = exports.Payload = exports.Topic = void 0;
exports.createMappingDecorator = createMappingDecorator;
exports.createRouteDecorator = createRouteDecorator;
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
const common_1 = require("@tsdi/common");
const router_1 = require("./router/router");
const route_handler_1 = require("./impl/route.handler");
const router_providers_1 = require("./router/router.providers");
const AbstractRequestContext_1 = require("./AbstractRequestContext");
var core_2 = require("@tsdi/core");
Object.defineProperty(exports, "Topic", { enumerable: true, get: function () { return core_2.Topic; } });
Object.defineProperty(exports, "Payload", { enumerable: true, get: function () { return core_2.Payload; } });
const primitiveResolvers = (0, core_1.createPayloadResolveInterceptors)((input, scope, field) => {
    if (field && !scope) {
        scope = 'query';
    }
    if (scope) {
        const data = (0, AbstractRequestContext_1.getScopeValue)(input, scope);
        if (field) {
            return (0, ioc_1.isDefined)(data) ? data[field] : null;
        }
        return data;
    }
    return input;
});
/**
 * Subscribe decorator, use to handle subscribe message event.
 * @Handle
 *
 * @exports {@link Handle}
 */
exports.Subscribe = (0, ioc_1.createDecorator)('Subscribe', {
    actionType: ioc_1.ActionType.annoation | ioc_1.ActionType.runnable,
    props: (route, arg1, option) => ((0, ioc_1.isNumber)(arg1) ? ({ route, transport: arg1, ...option }) : ({ route, ...arg1 })),
    appendProps: (meta) => {
        if (!meta.resolvers) {
            meta.resolvers = [];
        }
        meta.resolvers.push(core_1.MODEL_RESOLVERS, core_1.typeResolveInterceptor, ...primitiveResolvers);
    },
    design: {
        method: (typeRef, ctx) => {
            const defines = typeRef.getDefines(ctx.currDecor);
            if (!defines || !defines.length)
                return;
            const injector = ctx.injector;
            const invocation = typeRef.createInvocation(injector);
            defines.forEach(def => {
                const metadata = def.metadata;
                const router = (0, router_providers_1.getRouter)(injector, metadata.transport, true);
                const prefix = (0, common_1.joinPath)(metadata.prefix, metadata.version);
                const path = router.formatter.format(metadata.route);
                const handler = (0, route_handler_1.createRouteHandler)(invocation, { ...metadata, path, prefix }, def.propertyKey);
                const route = {
                    prefix,
                    path,
                    pattern: metadata.route,
                    paths: metadata.paths,
                    handler
                };
                router.use(route);
                invocation.onDestroy(() => router.unuse(route));
            });
        }
    }
});
/**
 * Handle decorator. use to define the class as middleware or define method as message handler.
 * @Handle
 *
 * @exports {@link Handle}
 */
exports.Handle = (0, ioc_1.createDecorator)('Handle', {
    actionType: ioc_1.ActionType.annoation | ioc_1.ActionType.runnable,
    isMatadata: (args) => {
        return (0, ioc_1.isMetadataObject)(args) && (0, ioc_1.isString)(args.route);
    },
    appendProps: (meta) => {
        if (!meta.resolvers) {
            meta.resolvers = [];
        }
        meta.resolvers.push(core_1.MODEL_RESOLVERS, core_1.typeResolveInterceptor, ...primitiveResolvers);
    },
    props: (route, arg1, option) => ((0, ioc_1.isNumber)(arg1) ? ({ route, transport: arg1, ...option }) : ({ route, ...arg1 })),
    def: {
        class: (ctx) => {
            ctx.classRef.assignAnnotation(ctx.define.metadata);
        }
    },
    design: {
        method: (typeRef, ctx) => {
            const defines = typeRef.getDefines(ctx.currDecor);
            if (!defines || !defines.length)
                return;
            const injector = ctx.injector;
            const invocation = typeRef.createInvocation(injector);
            defines.forEach(def => {
                const metadata = def.metadata;
                const router = (0, router_providers_1.getRouter)(injector, metadata.transport, true);
                const prefix = (0, common_1.joinPath)(metadata.prefix, metadata.version);
                if (!router || !(router instanceof router_1.Router))
                    throw new ioc_1.Exception(metadata.transport + ' microservice router has not register.');
                const path = router.formatter.format(metadata.route);
                const handler = (0, route_handler_1.createRouteHandler)(invocation, { ...metadata, path, prefix }, def.propertyKey);
                const route = {
                    prefix,
                    path,
                    pattern: metadata.route,
                    paths: metadata.paths,
                    handler
                };
                router.use(route);
                invocation.onDestroy(() => router.unuse(route));
            });
        },
        afterAnnoation: (typeRef, ctx) => {
            const mapping = typeRef.getAnnotation();
            const injector = ctx.injector;
            const type = typeRef.type;
            const router = mapping.router ? injector.get(mapping.router) : (0, router_providers_1.getRouter)(injector, mapping.transport);
            const route = mapping.route;
            if (!route)
                throw new ioc_1.Exception((0, ioc_1.getTypeName)(typeRef.type) + ' has not route!');
            if (!router)
                throw new ioc_1.Exception((0, ioc_1.getTypeName)(parent) + ' has not registered!');
            if (!(router instanceof router_1.Router))
                throw new ioc_1.Exception((0, ioc_1.getTypeName)(router) + ' is not router!');
            router.use({
                prefix: (0, common_1.joinPath)(mapping.prefix, mapping.version),
                path: router.formatter.format(route),
                pattern: mapping.route,
                paths: mapping.paths,
                handle: (input, ctx) => {
                    return injector.get(type).handle(input, ctx);
                },
                handler: type
            });
        }
    }
});
function createMappingDecorator(name, controllerOnly) {
    return (0, ioc_1.createDecorator)(name, {
        props: (route, arg2) => {
            route = (0, common_1.normalize)(route);
            if ((0, ioc_1.isArray)(arg2)) {
                return { route, guards: arg2 };
            }
            else if (!controllerOnly && (0, ioc_1.isString)(arg2)) {
                return { route, method: arg2 };
            }
            else if (ioc_1.lang.isBaseOf(arg2, router_1.Router)) {
                return { route, router: arg2 };
            }
            else {
                return { ...arg2, route };
            }
        },
        appendProps: (meta) => {
            if (!meta.resolvers) {
                meta.resolvers = [];
            }
            meta.resolvers.push(core_1.MODEL_RESOLVERS, core_1.typeResolveInterceptor, ...primitiveResolvers);
        },
        def: controllerOnly ? undefined : {
            class: (ctx) => {
                ctx.classRef.assignAnnotation(ctx.define.metadata);
            }
        },
        design: {
            afterAnnoation: (typeRef, ctx) => {
                const injector = ctx.injector;
                const mapping = typeRef.getAnnotation();
                const router = mapping.router ? injector.get(mapping.router) : (0, router_providers_1.getRouter)(injector, mapping.transport);
                if (!router)
                    throw new ioc_1.Exception((0, ioc_1.getTypeName)(parent) + 'has not registered!');
                if (!(router instanceof router_1.Router))
                    throw new ioc_1.Exception((0, ioc_1.getTypeName)(router) + 'is not router!');
                const route = {
                    prefix: (0, common_1.joinPath)(mapping.prefix, mapping.version),
                    path: router.formatter.format(mapping.route),
                    pattern: mapping.route,
                    controller: typeRef.createInvocation(injector)
                };
                router.use(route);
                route.controller.onDestroy(() => {
                    router.unuse(route);
                });
            }
        }
    });
}
/**
 * RouteMapping decorator
 *
 * @exports  {@link RouteMapping}
 */
exports.RouteMapping = createMappingDecorator('RouteMapping');
/**
 * Request header param decorator.
 *
 * @exports {@link TransportParameterDecorator}
 */
exports.RequestHeader = (0, ioc_1.createParamDecorator)('RequestHeader', {
    actionType: ioc_1.ActionType.inject,
    props: (field, pipe) => ({ field, ...pipe }),
    appendProps: meta => {
        if (meta.flags) {
            meta.flags |= ioc_1.InjectFlags.Request;
        }
        else {
            meta.flags = ioc_1.InjectFlags.Request;
        }
        meta.scope = 'headers';
    }
});
/**
 * Request path param decorator.
 *
 * @exports {@link TransportParameterDecorator}
 */
exports.RequestPath = (0, ioc_1.createParamDecorator)('RequestPath', {
    actionType: ioc_1.ActionType.inject,
    props: (field, pipe) => ({ field, ...pipe }),
    appendProps: meta => {
        if (meta.flags) {
            meta.flags |= ioc_1.InjectFlags.Request;
        }
        else {
            meta.flags = ioc_1.InjectFlags.Request;
        }
        meta.scope = 'path';
    }
});
/**
 * Request query param decorator.
 *
 * @exports {@link TransportParameterDecorator}
 */
exports.RequestParam = (0, ioc_1.createParamDecorator)('RequestParam', {
    actionType: ioc_1.ActionType.inject,
    props: (field, pipe) => ({ field, ...pipe }),
    appendProps: meta => {
        if (meta.flags) {
            meta.flags |= ioc_1.InjectFlags.Request;
        }
        else {
            meta.flags = ioc_1.InjectFlags.Request;
        }
        meta.scope = 'query';
    }
});
/**
 * Request body param decorator.
 *
 * @exports {@link TransportParameterDecorator}
 */
exports.RequestBody = (0, ioc_1.createParamDecorator)('RequestBody', {
    actionType: ioc_1.ActionType.inject,
    props: (field, pipe) => ({ field, ...pipe }),
    appendProps: meta => {
        if (meta.flags) {
            meta.flags |= ioc_1.InjectFlags.Request;
        }
        else {
            meta.flags = ioc_1.InjectFlags.Request;
        }
        meta.scope = 'body';
    }
});
/**
 * Controller decorator
 */
exports.Controller = createMappingDecorator('Controller');
/**
 * RestController decorator
 * @alias of Controller
 */
exports.RestController = exports.Controller;
/**
 * create route decorator.
 *
 * @export
 * @template T
 * @param {RequestMethod} [method]
 * @param { MetadataExtends<T>} [metaExtends]
 */
function createRouteDecorator(method) {
    return (0, ioc_1.createDecorator)('Route', {
        appendProps: (meta) => {
            if (!meta.resolvers) {
                meta.resolvers = [];
            }
            meta.resolvers.push(core_1.typeResolveInterceptor);
        },
        props: (route, arg2) => {
            route = (0, common_1.normalize)(route);
            return ((0, ioc_1.isString)(arg2) ? { route, contentType: arg2, method } : { route, ...arg2, method });
        }
    });
}
/**
 * Head decorator. define the route method as head.
 *
 * @Head
 */
exports.Head = createRouteDecorator(common_1.HEAD);
/**
 * Options decorator. define the route method as an options.
 *
 * @Options
 */
exports.Options = createRouteDecorator('OPTIONS');
/**
 * Get decorator. define the route method as get.
 *
 * @Get
 */
exports.Get = createRouteDecorator(common_1.GET);
/**
 * Delete decorator. define the route method as delete.
 *
 * @Delete
 */
exports.Delete = createRouteDecorator(common_1.DELETE);
/**
 * Patch decorator. define the route method as patch.
 *
 * @Patch
 */
exports.Patch = createRouteDecorator(common_1.PATCH);
/**
 * Post decorator. define the route method as post.
 *
 * @Post
 */
exports.Post = createRouteDecorator(common_1.POST);
/**
 * Put decorator. define the route method as put.
 *
 * @Put
 */
exports.Put = createRouteDecorator(common_1.PUT);
//# sourceMappingURL=metadata.js.map