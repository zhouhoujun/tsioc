import {
    isUndefined, Type, createDecorator, Provider, InjectableMetadata, PropertyMetadata, ActionTypes, InjectFlags,
    MethodPropDecorator, Token, ArgumentException, object2string, InvokeArguments,
    isString, Parameter, createParamDecorator, TypeOf, isNil, UseAsStatic, isFunction,
    ModuleType, ClassType, MutilProvider, Class, Injector, ProvidedInMetadata, AnnotationMetadata,
    Invocation
} from '@tsdi/ioc';
import { PipeTransform } from './pipes/pipe';
import {
    ApplicationDisposeEvent, ApplicationShutdownEvent, ApplicationStartupEvent,
    ApplicationStartedEvent, ApplicationStartEvent, PayloadApplicationEvent
} from './events';
import { FilterFn, FilterHandlerResolver, FilterResolver } from './filters/filter';
import { InvocationHandlerOptions } from './invocation';
import { ApplicationEvent } from './ApplicationEvent';
import { ApplicationEventPublisher } from './ApplicationEventPublisher';
import { ApplicationEventMulticaster } from './ApplicationEventMulticaster';
import { TransportParameter, TransportParameterOptions } from './handlers/resolver';
import { ApplicationInterceptorFn, InterceptorResolver } from './ApplicationInterceptor';
import { createInvocationHandler } from './impl/invocation';


/**
 * Runner option.
 * 
 * 运行接口配置
 */
export interface RunnerOption<TArg> extends InvocationHandlerOptions<TArg> {
    /**
     * custom provider parmeters as default. if not has design parameters.
     */
    parameters?: Parameter[];
}

/**
 * Runner decorator, use to define the method of class as application Runner.
 */
export interface Runner {
    /**
     * Runner decorator, use to define the method of class as application Runner.
     *
     * 运行接口修饰器， 用于声明该方法为应用程序的运行接口。
     * @Module
     *
     * @param {string} runable the method of the class to run.
     * @param {RunnerOption} [args] the method invoke arguments {@link RunnerOption}.
     */
    <TArg>(runable: string, args?: RunnerOption<TArg>): ClassDecorator;

    /**
     * Runner decorator, use to define the method of class as application Runner.
     * 
     * 运行接口修饰器， 用于声明该方法为应用程序的运行接口。
     * @param {InvokeArguments} [args] the method invoke arguments {@link InvokeArguments}.
     */
    <TArg>(args?: InvocationHandlerOptions<TArg>): MethodDecorator;
}

/**
 * @Runner decorator.
 */
export const Runner: Runner = createDecorator('Runner', {
    actionType: ActionTypes.runnable,
    props: <TArg>(method: string | RunnerOption<TArg>, args?: RunnerOption<TArg>) =>
        (isString(method) ? { method, args } : { args: method }),

    afterInit: (ctx) => {
        const meta = ctx.define.metadata as { method: string, args: RunnerOption<any> };
        if (meta.args?.parameters) {
            ctx.class.setParameters(meta.method, meta.args.parameters)
        }
    }
});


/**
 * pipe decorator.
 */
export type PipeDecorator = <TFunction extends Type<PipeTransform>>(target: TFunction) => TFunction | void;

/**
 * Pipe decorator.
 *
 * @export
 * @interface Pipe
 */
export interface Pipe {
    /**
     * Pipe decorator, define the class as pipe.
     *
     * @Pipe
     * @param {Type} toType the type transform to.
     * @param {boolean} pure If Pipe is pure (its output depends only on its input.) defaut true.
     */
    (name: string, pure?: boolean): PipeDecorator;
    /**
     * Pipe decorator, define the class as pipe.
     *
     * @Pipe
     *
     * @param {PipeMetadata} [metadata] metadata map.
     */
    (metadata: PipeMetadata): PipeDecorator;
}

/**
 * Pipe decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`PipeLifecycle`]
 *
 * @Pipe
 * @expors {@link Pipe}
 */
export const Pipe: Pipe = createDecorator<PipeMetadata>('Pipe', {
    actionType: [ActionTypes.annoation, ActionTypes.providers],
    def: {
        class: (ctx) => {
            ctx.class.setAnnotation(ctx.define.metadata);
        }
    },
    props: (name: string, pure?: boolean) => ({ name, provide: name, pure }),
    appendProps: meta => {
        if (isUndefined(meta.pure)) {
            meta.pure = true
        }
    }
});

/**
 * `Bean` decorator. bean provider, provider the value of the method or property for `Confgiuration`.
 */
export interface BeanDecorator {
    /**
     * `Bean` decorator. bean provider, provider the value of the method or property for `Confgiuration`.
     * 
     * 配置项修饰器，用于声明该方法或属性是输出的配置项内容。
     * @param {Token} provide the value of the method or property for the provide token.
     * @param {Omit<BeanMetadata, 'provide'>} options the static option for the provide token.
     */
    (provide?: Token, options?: Omit<BeanMetadata, 'provide'>): MethodPropDecorator;
}

/**
 * `Bean` decorator. bean provider, provider the value of the method or property for `Confgiuration`.
 */
export const Bean: BeanDecorator = createDecorator<BeanMetadata>('Bean', {
    props: (provide: Token, options?: Omit<BeanMetadata, 'provide'>) => ({ ...options, provide }),
    afterInit: (ctx) => {
        const metadata = ctx.define.metadata as BeanMetadata & PropertyMetadata;
        if (!metadata.provide) {
            if (metadata.type !== Object) {
                metadata.provide = metadata.type as any
            } else {
                throw new ArgumentException(`the property has no design Type, named ${ctx.define.propertyKey} with @Bean decorator in type ${object2string(ctx.class.type)}`)
            }
        }
    }
});

export interface ConfgiurationMetadata extends InjectableMetadata {
    /**
     * imports dependens modules
     *
     * @type {Modules[]}
     */
    imports?: ModuleType<ClassType>[];
}

/**
 * `Configuartion` decorator, define the class as auto Configuration provider.
 */
export interface ConfigurationDecorator {
    /**
     * `Configuartion` decorator, define the class as auto Configuration provider.
     * 
     * 配置修饰器，声明该类为配置提供者。
     * @Configuartion
     */
    (option?: ConfgiurationMetadata): ClassDecorator;
}
/**
 * `Configuartion` decorator, define the class as auto Configuration provider.
 * @Configuartion
 */
export const Configuration: ConfigurationDecorator = createDecorator<ConfgiurationMetadata>('Configuration', {
    actionType: ActionTypes.annoation,
    design: {
        afterAnnoation: (ctx) => {
            const { class: typeRef, injector } = ctx;
            const meta = typeRef.getMetadata<ConfgiurationMetadata>(ctx.currDecor);
            if (meta.imports) {
                injector.inject({
                    provider: async (injector) => {
                        const invocation = typeRef.createInvocation(injector)
                        await invocation.context.injector.useAsync(meta.imports!);
                        injectBean(injector, typeRef, meta, invocation)
                    },
                })
            } else {
                injectBean(injector, typeRef, meta)
            }
        }
    },
    appendProps: (meta) => {
        if (isNil(meta.static) && isNil(meta.singleton)) {
            meta.static = true
        }
    }
});

function injectBean(injector: Injector, typeRef: Class<any>, meta: ConfgiurationMetadata, invocation?: Invocation<any>) {
    if (!invocation) {
        invocation = typeRef.createInvocation(injector);
    }


    if (meta.providers) invocation.context.injector.inject(meta.providers);

    typeRef.defs.filter(d => d.decor === Bean)
        .forEach(d => {
            const key = d.propertyKey;
            const { provide, static: stac, multi, multiOrder, providedIn } = d.metadata as BeanMetadata;
            let provider: Provider
            if (d.decorType === 'method') {
                provider = {
                    provide,
                    useFactory: () => invocation.invoke(key),
                    static: stac,
                    multi,
                    multiOrder
                } as Provider
            } else {
                provider = {
                    provide,
                    useFactory: () => invocation.instance[key],
                    static: stac,
                    multi,
                    multiOrder
                } as Provider
            }
            providedIn ? injector.platform().getInjector(providedIn).inject(provider) : injector.inject(provider);
        });
}

/**
 * event hander.
 * @EventHandler
 */
export interface EventHandler {

    /**
     * `EventHandler` dectorator, payload event message handle. use to handle payload event message of {@link  ApplicationEventPublisher}.
     *
     * @param {order?: number } option message match option.
     */
    (option?: InvocationHandlerOptions): MethodDecorator;
    /**
     * `EventHandler` dectorator, event message handle. use to handle event message of {@link  ApplicationEventPublisher}.
     *
     * @param {Type} event message match pattern.
     * @param {order?: number } option message match option.
     */
    (event: Type<ApplicationEvent>, option?: InvocationHandlerOptions): MethodDecorator;
}

function createEventHandler(defaultFilter: Type<ApplicationEvent>, name: string, runtime?: boolean) {
    return createDecorator(name, {
        props: (filter?: Type | string, options?: { order?: number }) => ({ filter, ...options }),
        design: {
            method: runtime === true ? undefined : (ctx) => {
                const typeRef = ctx.class;
                if (typeRef.getAnnotation().static === false && !typeRef.getAnnotation().singleton) return;

                const decors = typeRef.getMethodDefines(ctx.currDecor);
                const injector = ctx.injector;
                const invocation = typeRef.createInvocation(injector);
                const currMulticaster = injector.get(ApplicationEventMulticaster);
                decors.forEach(decor => {
                    const { filter, order, providedIn, ...options } = decor.metadata as InvocationHandlerOptions & { filter: Type<ApplicationEvent> & { getStrategy?: () => string } };
                    const handler = createInvocationHandler(invocation, options, decor.propertyKey);
                    const event = filter ?? defaultFilter;
                    const isFILO = isFunction(event.getStrategy) && event.getStrategy() == 'FILO';
                    const multicaster = providedIn ? injector.platform().getInjector(providedIn).get(ApplicationEventMulticaster) : currMulticaster;
                    multicaster.addListener(event, handler, isFILO ? order ?? 0 : order);
                    invocation.onDestroy(() => multicaster.removeListener(event, handler))
                });
            }
        },
        runtime: {
            method: (ctx) => {
                const typeRef = ctx.class;
                if (!runtime && (
                    !ctx.context?.isResolve
                    || typeRef.getAnnotation().static === true
                    || typeRef.getAnnotation().singleton
                )) return;

                const decors = typeRef.getMethodDefines(ctx.currDecor);
                const injector = ctx.injector;
                const invocation = typeRef.createInvocation(injector, { instance: ctx.instance });
                const currMulticaster = injector.get(ApplicationEventMulticaster);
                decors.forEach(decor => {
                    const { filter, order, providedIn, ...options } = decor.metadata as InvocationHandlerOptions & { filter: Type<ApplicationEvent> & { getStrategy?: () => string } };
                    const handler = createInvocationHandler(invocation, options, decor.propertyKey);
                    const event = filter ?? defaultFilter;
                    const isFILO = isFunction(event.getStrategy) && event.getStrategy() == 'FILO';
                    const multicaster = providedIn ? injector.platform().getInjector(providedIn).get(ApplicationEventMulticaster) : currMulticaster;
                    multicaster.addListener(event, handler, isFILO ? order ?? 0 : order);
                    invocation.onDestroy(() => multicaster.removeListener(event, handler))
                });
            }
        }
    })
}

/**
 * event hander.
 * handle method return false, stop event loop.
 * @EventHandler
 */
export const EventHandler: EventHandler = createEventHandler(PayloadApplicationEvent, 'EventHandler', true);


/**
 * event handler metadata.
 */
export interface EventHandlerMetadata<TArg> extends InvocationHandlerOptions<TArg> {
    /**
     * execption type.
     */
    filter: Type;
}

/**
 * Application Startup event hander.
 * rasie after `ApplicationContextRefreshEvent`
 * @Startup
 */
export interface StartupEventHandler {

    /**
     * Application Startup event handle.
     * rasie after `ApplicationContextRefreshEvent`
     * @param {InvocationHandlerOptions} option message match option.
     */
    (option?: InvocationHandlerOptions): MethodDecorator;
}

/**
 * Application Startup event hander.
 * rasie after `ApplicationContextRefreshEvent`
 * @Startup
 */
export const Startup: StartEventHandler = createEventHandler(ApplicationStartupEvent, 'Startup');

/**
 * Application start event hander.
 * rasie after `ApplicationStartupEvent`
 * @Start
 */
export interface StartEventHandler {

    /**
     * Application start event handle.
     * rasie after `ApplicationStartupEvent`
     * @param {InvocationHandlerOptions} option message match option.
     */
    (option?: InvocationHandlerOptions): MethodDecorator;
}

/**
 * Application start event hander.
 * rasie after `ApplicationStartupEvent`
 * @Start
 */
export const Start: StartEventHandler = createEventHandler(ApplicationStartEvent, 'Start');

/**
 * Application started event hander.
 * rasie after `ApplicationStartEvent`
 * @Started
 */
export interface StartedEventHandler {

    /**
     * Application started event handle.
     * rasie after `ApplicationStartEvent`
     * @param {InvocationHandlerOptions} option message match option.
     */
    (option?: InvocationHandlerOptions): MethodDecorator;
}

/**
 * Application Started event hander.
 * rasie after `ApplicationStartEvent`
 * @Start
 */
export const Started: StartedEventHandler = createEventHandler(ApplicationStartedEvent, 'Started');


/**
 * Application Shutdown event hander.
 * rasie after Application close invoked.
 * @Shutdown
 */
export interface ShutdownEventHandler {

    /**
     * Application Shutdown event handle.
     * rasie after Application close invoked.
     * @param {InvocationHandlerOptions} option message match option.
     */
    (option?: InvocationHandlerOptions): MethodDecorator;
}

/**
 * Application Shutdown event hander.
 * rasie after Application close invoked.
 * @Shutdown
 */
export const Shutdown: ShutdownEventHandler = createEventHandler(ApplicationShutdownEvent, 'Shutdown', true);


/**
 * Application Dispose event hander.
 * rasie after `ApplicationShutdownEvent`
 * @Dispose
 */
export interface DisposeEventHandler {

    /**
     * Application Dispose event handle.
     * rasie after `ApplicationShutdownEvent`
     * @param {InvocationHandlerOptions} option message match option.
     */
    (option?: InvocationHandlerOptions): MethodDecorator;
}

/**
 * Application Shutdown event hander.
 * rasie after `ApplicationShutdownEvent`
 * @Dispose
 */
export const Dispose: DisposeEventHandler = createEventHandler(ApplicationDisposeEvent, 'Dispose', true);

/**
 * Intercept metadata.
 */
export interface InterceptMetadata extends ProvidedInMetadata {
    /**
     * intercept target type.
     */
    target: Token;
    /**
     * regitster in target as token or not. 
     */
    token?: boolean;

    order?: number;
}

export type InterceptDecorator = <T extends ApplicationInterceptorFn>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T> | void

/**
 * Interceptable
 */
export interface Interceptable {
    /**
     * Interceptable decorator, for class. use to define the class as interceptor register in global interceptor.
     *
     * @param {Type} target intercept target.
     * @param  {Omit<InterceptMetadata, 'target'>} option intercept options.
     */
    (target: Type | string, option?: Omit<InterceptMetadata, 'target'>): InterceptDecorator;

}



/**
 * Interceptable decorator, for class. use to define the class as interceptor register in global interceptor.
 * @Interceptable
 * 
 * @exports {@link Interceptable}
 */
export const Interceptable: Interceptable = createDecorator('Interceptable', {
    props: (target: Type | string, options?: InvocationHandlerOptions) => ({ target, ...options }),
    design: {
        method: (ctx) => {
            const typeRef = ctx.class;
            const decors = typeRef.getMethodDefines<InterceptMetadata>(ctx.currDecor);
            const injector = ctx.injector;
            const invocation = typeRef.createInvocation(injector);
            const currResolver = injector.get(InterceptorResolver);
            decors.forEach(decor => {
                const { target, token, order, providedIn } = decor.metadata;
                const interceptor = (...args: any[]) => invocation.invoke(decor.propertyKey, args);
                if (token) {
                    const provider = { provide: interceptor, useValue: interceptor, multi: true, multiOrder: order };
                    providedIn ? injector.platform().getInjector(providedIn).inject(provider) : injector.inject(provider);
                } else {
                    const resolver = providedIn ? injector.platform().getInjector(providedIn).get(InterceptorResolver) : currResolver;
                    resolver.addInterceptor(target as Type | string, interceptor, order);
                    invocation.onDestroy(() => resolver.removeInterceptor(target as Type | string, interceptor));

                }
            });
        }
    }
});

export type FilterDecorator = <T extends FilterFn>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T> | void

/**
 * Filterable
 */
export interface Filterable {
    /**
     * Filterable decorator, for class. use to define the class as filter register in global filter.
     *
     * @param {Type} target filter target.
     * @param { Omit<InterceptMetadata, 'filter'>} option filter options.
     */
    (target: Type | string, option?: Omit<InterceptMetadata, 'target'>): FilterDecorator;
}



/**
 * Filterable decorator, for class. use to define the class as filter register in global filter.
 * @Filterable
 * 
 * @exports {@link Filterable}
 */
export const Filterable: Filterable = createDecorator('Filterable', {
    props: (target: Type | string, options?: InvocationHandlerOptions) => ({ target, ...options }),
    design: {
        method: (ctx) => {
            const typeRef = ctx.class;
            const decors = typeRef.getMethodDefines<InterceptMetadata>(ctx.currDecor);
            const injector = ctx.injector;
            const invocation = typeRef.createInvocation(injector);
            const currResolver = injector.get(FilterResolver);
            decors.forEach(decor => {
                const { target, token, order, providedIn } = decor.metadata;
                const filter = (...args: any[]) => invocation.invoke(decor.propertyKey, args);
                if (token) {
                    const provider = { provide: target, useValue: filter, multi: true, multiOrder: order };
                    providedIn ? injector.platform().getInjector(providedIn).inject(provider) : injector.inject(provider);
                } else {
                    const resolver = providedIn ? injector.platform().getInjector(providedIn).get(FilterResolver) : currResolver;
                    resolver.addFilter(target as Type | string, filter, order);
                    invocation.onDestroy(() => resolver.removeFilter(target as Type | string, filter));
                }
            });
        }
    }
});




/**
 * Filter handler metadata.
 */
export interface FilterHandlerMetadata<TArg> extends InvocationHandlerOptions<TArg> {
    /**
     * filter type.
     */
    filter: Type | string;
}


/**
 * FilterHandler decorator, for class. use to define the class as response handle register in global filter.
 *
 * @export
 * @interface handlerHandler
 */
export interface FilterHandler {
    /**
     * FilterHandler decorator, for class. use to define the class as handler handle register in global filter.
     *
     * @param {Type} filter message match pattern.
     * @param {order?: number } option message match option.
     */
    <TArg = any>(filter: Type | string, option?: InvocationHandlerOptions<TArg>): MethodDecorator;
}

/**
 * FilterHandler decorator, for class. use to define the class as handler handle register in global filter.
 * @FilterHandler
 * 
 * @exports {@link FilterHandler}
 */
export const FilterHandler: FilterHandler = createDecorator('FilterHandler', {
    props: (filter?: Type | string, options?: InvocationHandlerOptions) => ({ filter, ...options }),
    design: {
        method: (ctx) => {
            const typeRef = ctx.class;
            const decors = typeRef.getMethodDefines<FilterHandlerMetadata<any>>(ctx.currDecor);
            const injector = ctx.injector;
            const invocation = typeRef.createInvocation(injector);
            const currResolver = injector.get(FilterHandlerResolver);
            decors.forEach(decor => {
                const { filter, order, providedIn, ...options } = decor.metadata;
                const handler = createInvocationHandler(invocation, options, decor.propertyKey);
                const resolver = providedIn ? injector.platform().getInjector(providedIn).get(FilterHandlerResolver) : currResolver;
                resolver.addHandle(filter, handler, order);
                invocation.onDestroy(() => resolver.removeHandle(filter, handler));
            });
        }
    }
});


/**
 * ExceptionHandler decorator, for class. use to define the class as execption handle register in global execption filter.
 *
 * @export
 * @interface ExceptionHandler
 */
export interface ExceptionHandler {
    /**
     * ExceptionHandler decorator, for class. use to define the class as execption handle register in global execption filter.
     *
     * @param {string} pattern message match pattern.
     * @param {order?: number } option message match option.
     */
    (execption: Type<Error>, option?: InvocationHandlerOptions): MethodDecorator;
}

/**
 * ExceptionHandler decorator, for class. use to define the class as execption handle register in global execption filter.
 * @ExceptionHandler
 * 
 * @exports {@link ExceptionHandler}
 */
export const ExceptionHandler: ExceptionHandler = FilterHandler;


/**
 * pipe metadata.
 *
 * @export
 * @interface PipeMetadata
 * @extends {TypeMetadata}
 */
export interface PipeMetadata extends AnnotationMetadata {
    /**
     * pipe class type.
     */
    type?: Type;
    /**
     * name of pipe.
     */
    name: string;
    /**
     * If Pipe is pure (its output depends only on its input.)
     */
    pure?: boolean;
}


/**
 * bean provider metadata.
 */
export interface BeanMetadata extends UseAsStatic, MutilProvider, ProvidedInMetadata {
    /**
     * the token bean provider to.
     */
    provide: Token;
}


export interface TransportParameterDecorator {
    /**
     * Request Parameter decorator
     *
     * @param {string} field field of request query params or body.
     * @param options route metedata options.
     */
    (field?: string, option?: TransportParameterOptions): ParameterDecorator;
    /**
     * Transport Parameter decorator
     * @param meta.
     */
    (meta: TransportParameter): ParameterDecorator;
}

/**
 * Subscribe payload param decorator.
 * 
 * @exports {@link TransportParameterDecorator}
 */
export const Payload: TransportParameterDecorator = createParamDecorator('Payload', {
    props: (field: string, pipe?: { pipe: string | TypeOf<PipeTransform>, args?: any[], defaultValue?: any }) => ({ field, ...pipe } as TransportParameter),
    appendProps: meta => {
        if (meta.flags) {
            meta.flags |= InjectFlags.Request;
        } else {
            meta.flags = InjectFlags.Request;
        }
        meta.scope = 'payload'
    }
});

/**
 * Subscribe topic param decorator.
 * 
 * @exports {@link TransportParameterDecorator}
 */
export const Topic: TransportParameterDecorator = createParamDecorator('Topic', {
    props: (field: string, pipe?: { pipe: string | Type<PipeTransform>, args?: any[], defaultValue?: any }) => ({ field, ...pipe } as TransportParameter),
    appendProps: meta => {
        if (meta.flags) {
            meta.flags |= InjectFlags.Request;
        } else {
            meta.flags = InjectFlags.Request;
        }
        meta.scope = 'topic'
    }
});
