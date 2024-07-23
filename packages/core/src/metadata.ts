import {
    isUndefined, Type, createDecorator, ProviderType, InjectableMetadata, PropertyMetadata, ActionTypes, InjectFlags,
    ReflectiveFactory, MethodPropDecorator, Token, ArgumentExecption, object2string, InvokeArguments, EMPTY,
    isString, Parameter, ProviderMetadata, Decors, createParamDecorator, TypeOf, isNil, PatternMetadata, UseAsStatic, isFunction,
    ModuleType,
    ClassType,
    MutilProvider
} from '@tsdi/ioc';
import { PipeTransform } from './pipes/pipe';
import {
    ApplicationDisposeEvent, ApplicationShutdownEvent, ApplicationStartupEvent,
    ApplicationStartedEvent, ApplicationStartEvent, PayloadApplicationEvent
} from './events';
import { FilterHandlerResolver } from './filters/filter';
import { InvocationOptions, InvocationFactoryResolver } from './invocation';
import { ApplicationEvent } from './ApplicationEvent';
import { ApplicationEventPublisher } from './ApplicationEventPublisher';
import { ApplicationEventMulticaster } from './ApplicationEventMulticaster';
import { TransportParameter, TransportParameterOptions } from './handlers/resolver';


/**
 * Runner option.
 * 
 * 运行接口配置
 */
export interface RunnerOption<TArg> extends InvocationOptions<TArg> {
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
    <TArg>(args?: InvocationOptions<TArg>): MethodDecorator;
}

/**
 * @Runner decorator.
 */
export const Runner: Runner = createDecorator('Runner', {
    actionType: 'runnable',
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
    actionType: [ActionTypes.annoation, ActionTypes.typeProviders],
    def: {
        class: (ctx, next) => {
            ctx.class.setAnnotation(ctx.define.metadata);
            return next()
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
                throw new ArgumentExecption(`the property has no design Type, named ${ctx.define.propertyKey} with @Bean decorator in type ${object2string(ctx.class.type)}`)
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
    actionType: [ActionTypes.annoation],
    design: {
        afterAnnoation: (ctx, next) => {
            const { class: typeRef, injector } = ctx;
            const meta = typeRef.getMetadata<ConfgiurationMetadata>(ctx.currDecor!);
            if (meta.imports) {
                injector.inject({
                    provider: async (injector) => {
                        const factory = injector.get(ReflectiveFactory).create(typeRef, injector);
                        await factory.injector.useAsync(meta.imports!);
                        if (meta.providers) factory.injector.inject(meta.providers);
                        const pdrs = typeRef.defs.filter(d => d.decor === Bean)
                            .map(d => {
                                const key = d.propertyKey;
                                const { provide, static: stac, multi, multiOrder } = d.metadata as BeanMetadata;
                                if (d.decorType === 'method') {
                                    return {
                                        provide,
                                        useFactory: () => factory.invoke(key),
                                        static: stac,
                                        multi,
                                        multiOrder
                                    } as ProviderType
                                } else {
                                    return {
                                        provide,
                                        useFactory: () => factory.getInstance()[key],
                                        static: stac,
                                        multi,
                                        multiOrder
                                    } as ProviderType
                                }
                            });
                        injector.inject(pdrs);
                    },
                })
            } else {
                const factory = injector.get(ReflectiveFactory).create(typeRef, injector);
                if (meta.providers) factory.injector.inject(meta.providers);
                const pdrs = typeRef.defs.filter(d => d.decor === Bean)
                    .map(d => {
                        const key = d.propertyKey;
                        const { provide, static: stac, multi, multiOrder } = d.metadata as BeanMetadata;
                        if (d.decorType === 'method') {
                            return {
                                provide,
                                useFactory: () => factory.invoke(key),
                                static: stac,
                                multi,
                                multiOrder
                            } as ProviderType
                        } else {
                            return {
                                provide,
                                useFactory: () => factory.getInstance()[key],
                                static: stac,
                                multi,
                                multiOrder
                            } as ProviderType
                        }
                    });
                injector.inject(pdrs);
            }

            next()
        }
    },
    appendProps: (meta) => {
        if (isNil(meta.static) && isNil(meta.singleton)) {
            meta.static = true
        }
    }
});

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
    <TArg>(option?: InvocationOptions<TArg>): MethodDecorator;
    /**
     * `EventHandler` dectorator, event message handle. use to handle event message of {@link  ApplicationEventPublisher}.
     *
     * @param {Type} event message match pattern.
     * @param {order?: number } option message match option.
     */
    <TArg>(event: Type<ApplicationEvent>, option?: InvocationOptions<TArg>): MethodDecorator;
}

function createEventHandler(defaultFilter: Type<ApplicationEvent>, name: string, runtime?: boolean) {
    return createDecorator(name, {
        props: (filter?: Type | string, options?: { order?: number }) => ({ filter, ...options }),
        design: {
            method: runtime === true ? undefined : (ctx, next) => {
                const typeRef = ctx.class;
                if (typeRef.getAnnotation().static === false && !typeRef.getAnnotation().singleton) return next();

                const decors = typeRef.methodDefs.get(ctx.currDecor.toString()) ?? EMPTY;
                const injector = ctx.injector;
                const factory = injector.get(InvocationFactoryResolver).resolve(typeRef, injector);
                const multicaster = injector.get(ApplicationEventMulticaster);
                decors.forEach(decor => {
                    const { filter, order, ...options } = decor.metadata;

                    const handler = factory.create(decor.propertyKey, options);

                    const event = filter ?? defaultFilter;
                    const isFILO = isFunction(event.getStrategy) && event.getStrategy() == 'FILO';
                    multicaster.addListener(event, handler, isFILO ? order ?? 0 : order);
                    factory.onDestroy(() => multicaster.removeListener(event, handler))
                });
                next()
            }
        },
        runtime: {
            method: (ctx, next) => {
                const typeRef = ctx.class;
                if (!runtime && (
                    !ctx.context?.isResolve
                    || typeRef.getAnnotation().static === true
                    || typeRef.getAnnotation().singleton
                )) return next();

                const decors = typeRef.methodDefs.get(ctx.currDecor.toString()) ?? EMPTY;
                const injector = ctx.injector;
                const factory = injector.get(InvocationFactoryResolver).resolve(typeRef, injector);
                const multicaster = injector.get(ApplicationEventMulticaster);
                decors.forEach(decor => {
                    const { filter, order, ...options } = decor.metadata;

                    const handler = factory.create(decor.propertyKey, { ...options, instance: ctx.instance! });

                    const event = filter ?? defaultFilter;
                    const isFILO = isFunction(event.getStrategy) && event.getStrategy() == 'FILO';
                    multicaster.addListener(event, handler, isFILO ? order ?? 0 : order);
                    factory.onDestroy(() => multicaster.removeListener(event, handler))
                });
                next()
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
export interface EventHandlerMetadata<TArg> extends InvocationOptions<TArg> {
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
     * @param {InvocationOptions} option message match option.
     */
    <TArg>(option?: InvocationOptions<TArg>): MethodDecorator;
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
     * @param {InvocationOptions} option message match option.
     */
    <TArg>(option?: InvocationOptions<TArg>): MethodDecorator;
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
     * @param {InvocationOptions} option message match option.
     */
    <TArg>(option?: InvocationOptions<TArg>): MethodDecorator;
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
     * @param {InvocationOptions} option message match option.
     */
    <TArg>(option?: InvocationOptions<TArg>): MethodDecorator;
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
     * @param {InvocationOptions} option message match option.
     */
    <TArg>(option?: InvocationOptions<TArg>): MethodDecorator;
}

/**
 * Application Shutdown event hander.
 * rasie after `ApplicationShutdownEvent`
 * @Dispose
 */
export const Dispose: DisposeEventHandler = createEventHandler(ApplicationDisposeEvent, 'Dispose', true);


/**
 * Filter handler metadata.
 */
export interface FilterHandlerMetadata<TArg> extends InvocationOptions<TArg> {
    /**
     * execption type.
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
     * message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {Type} filter message match pattern.
     * @param {order?: number } option message match option.
     */
    <TArg = any>(filter: Type | string, option?: InvocationOptions<TArg>): MethodDecorator;
}

/**
 * FilterHandler decorator, for class. use to define the class as handler handle register in global filter.
 * @FilterHandler
 * 
 * @exports {@link FilterHandler}
 */
export const FilterHandler: FilterHandler = createDecorator('FilterHandler', {
    props: (filter?: Type | string, options?: { order?: number }) => ({ filter, ...options }),
    design: {
        method: (ctx, next) => {
            const typeRef = ctx.class;
            const decors = typeRef.getDecorDefines<FilterHandlerMetadata<any>>(ctx.currDecor, Decors.method);
            const injector = ctx.injector;
            const factory = injector.get(InvocationFactoryResolver).resolve(typeRef, injector);
            const handlerResolver = injector.get(FilterHandlerResolver);
            decors.forEach(decor => {
                const { filter, order, ...options } = decor.metadata;
                const handler = factory.create(decor.propertyKey, options);
                handlerResolver.addHandle(filter, handler, order);
                factory.onDestroy(() => handlerResolver.removeHandle(filter, handler));
            });

            next()
        }
    }
});


/**
 * ExecptionHandler decorator, for class. use to define the class as execption handle register in global execption filter.
 *
 * @export
 * @interface ExecptionHandler
 */
export interface ExecptionHandler {
    /**
     * message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {string} pattern message match pattern.
     * @param {order?: number } option message match option.
     */
    <TArg = any>(execption: Type<Error>, option?: InvocationOptions<TArg>): MethodDecorator;
}

/**
 * ExecptionHandler decorator, for class. use to define the class as execption handle register in global execption filter.
 * @ExecptionHandler
 * 
 * @exports {@link ExecptionHandler}
 */
export const ExecptionHandler: ExecptionHandler = FilterHandler;


/**
 * pipe metadata.
 *
 * @export
 * @interface PipeMetadata
 * @extends {TypeMetadata}
 */
export interface PipeMetadata extends ProviderMetadata {
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
export interface BeanMetadata extends UseAsStatic, MutilProvider {
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


