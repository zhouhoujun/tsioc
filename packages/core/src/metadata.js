"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Topic = exports.Payload = exports.ExceptionHandler = exports.FilterHandler = exports.Filterable = exports.Interceptable = exports.Dispose = exports.Shutdown = exports.Started = exports.Start = exports.Startup = exports.EventHandler = exports.Configuration = exports.Bean = exports.Pipe = exports.Runner = void 0;
const ioc_1 = require("@tsdi/ioc");
const events_1 = require("./events");
const filter_1 = require("./filters/filter");
const ApplicationEventMulticaster_1 = require("./ApplicationEventMulticaster");
const resolver_1 = require("./handlers/resolver");
const interceptor_1 = require("./interceptor");
const invocation_1 = require("./impl/invocation");
/**
 * @Runner decorator.
 */
exports.Runner = (0, ioc_1.createDecorator)('Runner', {
    actionType: ioc_1.ActionType.runnable,
    props: (method, args) => ((0, ioc_1.isString)(method) ? { method, args } : { args: method }),
    afterInit: (ctx) => {
        const meta = ctx.define.metadata;
        if (meta.args?.parameters) {
            ctx.classRef.setMethodOptions(meta.method, meta.args);
        }
    }
});
/**
 * Pipe decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`PipeLifecycle`]
 *
 * @Pipe
 * @expors {@link Pipe}
 */
exports.Pipe = (0, ioc_1.createDecorator)('Pipe', {
    actionType: ioc_1.ActionType.annoation | ioc_1.ActionType.providers,
    def: {
        class: (ctx) => {
            ctx.classRef.assignAnnotation(ctx.define.metadata);
        }
    },
    props: (selector, pure) => ({ selector, provide: selector, pure }),
    appendProps: meta => {
        if ((0, ioc_1.isUndefined)(meta.pure)) {
            meta.pure = true;
        }
    }
});
/**
 * `Bean` decorator. bean provider, provider the value of the method or property for `Confgiuration`.
 */
exports.Bean = (0, ioc_1.createDecorator)('Bean', {
    props: (provide, options) => ({ ...options, provide }),
    afterInit: (ctx) => {
        const metadata = ctx.define.metadata;
        if (!metadata.provide) {
            if (metadata.type !== Object) {
                metadata.provide = metadata.type;
            }
            else {
                throw new ioc_1.ArgumentException(`the property has no design Type, named ${ctx.define.propertyKey} with @Bean decorator in type ${(0, ioc_1.object2string)(ctx.classRef.type)}`);
            }
        }
    }
});
/**
 * `Configuartion` decorator, define the class as auto Configuration provider.
 * @Configuartion
 */
exports.Configuration = (0, ioc_1.createDecorator)('Configuration', {
    actionType: ioc_1.ActionType.annoation,
    design: {
        afterAnnoation: (typeRef, ctx) => {
            const injector = ctx.injector;
            const meta = typeRef.getMetadata(ctx.currDecor);
            if (meta.imports) {
                ioc_1.InjectUtil.provider(injector, {
                    provider: async (injector) => {
                        const invocation = typeRef.createInvocation(injector);
                        await ioc_1.InjectUtil.useAsync(invocation.injector, meta.imports);
                        injectBean(injector, typeRef, meta, invocation);
                    },
                });
            }
            else {
                injectBean(injector, typeRef, meta);
            }
        }
    },
    appendProps: (meta) => {
        if ((0, ioc_1.isNil)(meta.static) && (0, ioc_1.isNil)(meta.singleton)) {
            meta.static = true;
        }
    }
});
function injectBean(injector, typeRef, meta, invocation) {
    if (!invocation) {
        invocation = typeRef.createInvocation(injector);
    }
    if (meta.providers)
        ioc_1.InjectUtil.inject(invocation.injector, meta.providers);
    typeRef.getDefines(exports.Bean)
        .forEach(d => {
        const key = d.propertyKey;
        const { provide, static: stac, multi, multiOrder } = d.metadata;
        let provider;
        if (d.decorType === 'method') {
            provider = {
                provide,
                useFactory: () => invocation.invoke(key),
                static: stac,
                multi,
                multiOrder
            };
        }
        else {
            provider = {
                provide,
                useFactory: () => invocation.instance[key],
                static: stac,
                multi,
                multiOrder
            };
        }
        ioc_1.InjectUtil.provider(injector, provider);
    });
}
function createEventHandler(defaultFilter, name, runtime) {
    return (0, ioc_1.createDecorator)(name, {
        actionType: ioc_1.ActionType.providers,
        props: (filter, options) => ({ filter, ...options }),
        appendProps: (meta) => {
            if (!meta.resolvers) {
                meta.resolvers = [];
            }
            meta.resolvers.push(resolver_1.typeResolveInterceptor);
        },
        design: {
            method: runtime === true ? undefined : (typeRef, ctx) => {
                if (typeRef.getAnnotation().static === false && !typeRef.getAnnotation().singleton)
                    return;
                const defines = typeRef.getDefines(ctx.currDecor);
                const injector = ctx.injector;
                const invocation = typeRef.createInvocation(injector);
                const multicaster = injector.get(ApplicationEventMulticaster_1.ApplicationEventMulticaster);
                defines.forEach(decor => {
                    const { filter, order, providedIn, ...options } = decor.metadata;
                    const handler = (0, invocation_1.createInvocationHandler)(invocation, options, decor.propertyKey);
                    const event = filter ?? defaultFilter;
                    const isFILO = (0, ioc_1.isFunction)(event.getStrategy) && event.getStrategy() == 'FILO';
                    multicaster.addListener(event, handler, isFILO ? order ?? 0 : order);
                    invocation.onDestroy(() => multicaster.removeListener(event, handler));
                });
            }
        },
        runtime: {
            method: runtime ? (typeRef, ctx) => {
                const defines = typeRef.getDefines(ctx.currDecor);
                const injector = ctx.raiseInjector;
                const invocation = typeRef.createInvocation(injector, { instance: ctx.instance });
                const multicaster = injector.get(ApplicationEventMulticaster_1.ApplicationEventMulticaster);
                defines.forEach(decor => {
                    const { filter, order, providedIn, ...options } = decor.metadata;
                    const handler = (0, invocation_1.createInvocationHandler)(invocation, options, decor.propertyKey);
                    const event = filter ?? defaultFilter;
                    const isFILO = (0, ioc_1.isFunction)(event.getStrategy) && event.getStrategy() == 'FILO';
                    multicaster.addListener(event, handler, isFILO ? order ?? 0 : order);
                    invocation.onDestroy(() => multicaster.removeListener(event, handler));
                });
            } : undefined
        }
    });
}
/**
 * event hander.
 * handle method return false, stop event loop.
 * @EventHandler
 */
exports.EventHandler = createEventHandler(events_1.PayloadApplicationEvent, 'EventHandler', true);
/**
 * Application Startup event hander.
 * rasie after `ApplicationContextRefreshEvent`
 * @Startup
 */
exports.Startup = createEventHandler(events_1.ApplicationStartupEvent, 'Startup');
/**
 * Application start event hander.
 * rasie after `ApplicationStartupEvent`
 * @Start
 */
exports.Start = createEventHandler(events_1.ApplicationStartEvent, 'Start');
/**
 * Application Started event hander.
 * rasie after `ApplicationStartEvent`
 * @Start
 */
exports.Started = createEventHandler(events_1.ApplicationStartedEvent, 'Started');
/**
 * Application Shutdown event hander.
 * rasie after Application close invoked.
 * @Shutdown
 */
exports.Shutdown = createEventHandler(events_1.ApplicationShutdownEvent, 'Shutdown', true);
/**
 * Application Shutdown event hander.
 * rasie after `ApplicationShutdownEvent`
 * @Dispose
 */
exports.Dispose = createEventHandler(events_1.ApplicationDisposeEvent, 'Dispose', true);
/**
 * Interceptable decorator, for class. use to define the class as interceptor register in global interceptor.
 * @Interceptable
 *
 * @exports {@link Interceptable}
 */
exports.Interceptable = (0, ioc_1.createDecorator)('Interceptable', {
    props: (target, options) => ({ target, ...options }),
    design: {
        method: (typeRef, ctx) => {
            const decors = typeRef.getDefines(ctx.currDecor);
            const injector = ctx.injector;
            const invocation = typeRef.createInvocation(injector);
            const currResolver = injector.get(interceptor_1.InterceptorResolver);
            decors.forEach(decor => {
                const { target, token, order, providedIn } = decor.metadata;
                const interceptor = (...args) => invocation.invoke(decor.propertyKey, args);
                if (token) {
                    const provider = { provide: interceptor, useValue: interceptor, multi: true, multiOrder: order };
                    ioc_1.InjectUtil.provider(providedIn ? injector.getRuntime().getInjector(providedIn) : injector, provider);
                }
                else {
                    const resolver = providedIn ? injector.getRuntime().getInjector(providedIn).get(interceptor_1.InterceptorResolver) : currResolver;
                    resolver.addInterceptor(target, interceptor, order);
                    invocation.onDestroy(() => resolver.removeInterceptor(target, interceptor));
                }
            });
        }
    }
});
/**
 * Filterable decorator, for class. use to define the class as filter register in global filter.
 * @Filterable
 *
 * @exports {@link Filterable}
 */
exports.Filterable = (0, ioc_1.createDecorator)('Filterable', {
    props: (target, options) => ({ target, ...options }),
    design: {
        method: (typeRef, ctx) => {
            const decors = typeRef.getDefines(ctx.currDecor);
            const injector = ctx.injector;
            const invocation = typeRef.createInvocation(injector);
            const currResolver = injector.get(filter_1.FilterResolver);
            decors.forEach(decor => {
                const { target, token, order, providedIn } = decor.metadata;
                const filter = (...args) => invocation.invoke(decor.propertyKey, args);
                if (token) {
                    const provider = { provide: target, useValue: filter, multi: true, multiOrder: order };
                    ioc_1.InjectUtil.provider(providedIn ? injector.getRuntime().getInjector(providedIn) : injector, provider);
                }
                else {
                    const resolver = providedIn ? injector.getRuntime().getInjector(providedIn).get(filter_1.FilterResolver) : currResolver;
                    resolver.addFilter(target, filter, order);
                    invocation.onDestroy(() => resolver.removeFilter(target, filter));
                }
            });
        }
    }
});
/**
 * FilterHandler decorator, for class. use to define the class as handler handle register in global filter.
 * @FilterHandler
 *
 * @exports {@link FilterHandler}
 */
exports.FilterHandler = (0, ioc_1.createDecorator)('FilterHandler', {
    props: (filter, options) => ({ filter, ...options }),
    design: {
        method: (typeRef, context) => {
            const decors = typeRef.getDefines(context.currDecor);
            const injector = context.injector;
            const invocation = typeRef.createInvocation(injector);
            const currResolver = injector.get(filter_1.FilterHandlerResolver);
            decors.forEach(decor => {
                const { filter, order, providedIn, ...options } = decor.metadata;
                const handler = (0, invocation_1.createInvocationHandler)(invocation, options, decor.propertyKey);
                const resolver = providedIn ? injector.getRuntime().getInjector(providedIn).get(filter_1.FilterHandlerResolver) : currResolver;
                resolver.addHandle(filter, handler, order);
                invocation.onDestroy(() => resolver.removeHandle(filter, handler));
            });
        }
    }
});
/**
 * ExceptionHandler decorator, for class. use to define the class as execption handle register in global execption filter.
 * @ExceptionHandler
 *
 * @exports {@link ExceptionHandler}
 */
exports.ExceptionHandler = exports.FilterHandler;
/**
 * Subscribe payload param decorator.
 *
 * @exports {@link TransportParameterDecorator}
 */
exports.Payload = (0, ioc_1.createParamDecorator)('Payload', {
    actionType: ioc_1.ActionType.inject,
    props: (field, pipe) => ({ field, ...pipe }),
    appendProps: meta => {
        if (meta.flags) {
            meta.flags |= ioc_1.InjectFlags.Request;
        }
        else {
            meta.flags = ioc_1.InjectFlags.Request;
        }
        meta.scope = 'payload';
    }
});
/**
 * Subscribe topic param decorator.
 *
 * @exports {@link TransportParameterDecorator}
 */
exports.Topic = (0, ioc_1.createParamDecorator)('Topic', {
    actionType: ioc_1.ActionType.inject,
    props: (field, pipe) => ({ field, ...pipe }),
    appendProps: meta => {
        if (meta.flags) {
            meta.flags |= ioc_1.InjectFlags.Request;
        }
        else {
            meta.flags = ioc_1.InjectFlags.Request;
        }
        meta.scope = 'topic';
    }
});
//# sourceMappingURL=metadata.js.map