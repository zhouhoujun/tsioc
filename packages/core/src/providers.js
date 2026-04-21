"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROOT_DEPENDENCE_PROVIDERS = exports.RESOLVER_PROVIDERS = exports.DEFAULTA_PROVIDERS = void 0;
const ioc_1 = require("@tsdi/ioc");
const ApplicationContext_1 = require("./ApplicationContext");
const ApplicationRunners_1 = require("./ApplicationRunners");
const uuid_1 = require("./uuid");
const ApplicationEventMulticaster_1 = require("./ApplicationEventMulticaster");
const runners_1 = require("./impl/runners");
const context_1 = require("./impl/context");
const events_1 = require("./impl/events");
const interceptor_1 = require("./interceptor");
const filter_1 = require("./filters/filter");
const filter_impl_1 = require("./filters/filter.impl");
const execption_filter_1 = require("./filters/execption.filter");
const resolver_1 = require("./handlers/resolver");
const events_2 = require("./events");
const resolvers_1 = require("./handlers/resolvers");
/**
 * Platform default providers
 */
exports.DEFAULTA_PROVIDERS = [
    { provide: ApplicationContext_1.ApplicationContextFactory, useClass: context_1.DefaultApplicationContextFactory, static: true },
    { provide: uuid_1.UuidGenerator, useClass: uuid_1.RandomUuidGenerator, asDefault: true, static: true }
];
exports.RESOLVER_PROVIDERS = [
    { provide: interceptor_1.InterceptorResolver, useFactory: (injector) => new filter_impl_1.DefaultInterceptorResolver(injector), deps: [ioc_1.Injector], static: true },
    { provide: filter_1.FilterResolver, useFactory: (injector) => new filter_impl_1.DefaultFilterResolver(injector), deps: [ioc_1.Injector], static: true },
    { provide: filter_1.FilterHandlerResolver, useFactory: (injector) => new filter_impl_1.DefaultFiterHandlerMethodResolver(injector), deps: [ioc_1.Injector], static: true },
    { provide: ApplicationEventMulticaster_1.ApplicationEventMulticaster, useFactory: (injector) => new events_1.DefaultEventMulticaster(injector), deps: [ioc_1.Injector], static: true },
    execption_filter_1.ExceptionHandlerFilter,
];
ioc_1.SCOPE_PRODIDERS.push(exports.RESOLVER_PROVIDERS);
/**
 * Application root dependence providers
 */
exports.ROOT_DEPENDENCE_PROVIDERS = [
    exports.RESOLVER_PROVIDERS,
    {
        provide: (0, resolver_1.getResolveHandlerToken)(events_2.PayloadApplicationEvent),
        useValue: (0, ioc_1.createResolveHandler)((0, resolvers_1.createPayloadResolveInterceptors)((input, scope, field) => {
            if (scope) {
                const scopeVal = input[scope];
                if (field) {
                    return (0, ioc_1.isDefined)(scopeVal) ? scopeVal[field] : null;
                }
                return scopeVal;
            }
            else if (field) {
                return null;
            }
            return input;
        }))
    },
    { provide: ApplicationRunners_1.ApplicationRunners, useClass: runners_1.DefaultApplicationRunners, static: true },
];
//# sourceMappingURL=providers.js.map