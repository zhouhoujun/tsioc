import {
    isUndefined, Type, createDecorator, ProviderType, InjectableMetadata, PropertyMetadata, ActionTypes, InjectFlags,
    ReflectiveFactory, MethodPropDecorator, Token, ArgumentExecption, object2string, InvokeArguments, EMPTY,
    isString, Parameter, ProviderMetadata, Decors, createParamDecorator, TypeOf, isNil, PatternMetadata, UseAsStatic, isFunction
} from '@tsdi/ioc';
import { PipeTransform } from './pipes/pipe';
import {
    ApplicationDisposeEvent, ApplicationShutdownEvent, ApplicationStartupEvent,
    ApplicationStartedEvent, ApplicationStartEvent, PayloadApplicationEvent
} from './events';
import { FilterHandlerResolver } from './filters/filter';
import { EndpointOptions } from './endpoints/endpoint.service';
import { EndpointFactoryResolver } from './endpoints/endpoint.factory';
import { ApplicationEvent } from './ApplicationEvent';
import { ApplicationEventPublisher } from './ApplicationEventPublisher';
import { ApplicationEventMulticaster } from './ApplicationEventMulticaster';
import { TransportParameter, TransportParameterOptions } from './endpoints/resolver';


/**
 * Runner option.
 * 
 * 运行接口配置
 */
export interface RunnerOption<TArg> extends EndpointOptions<TArg> {
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
    <TArg>(args?: EndpointOptions<TArg>): MethodDecorator;
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
     * @param {UseAsStatic} options the static option for the provide token.
     */
    (provide?: Token, options?: UseAsStatic): MethodPropDecorator;
}

/**
 * `Bean` decorator. bean provider, provider the value of the method or property for `Confgiuration`.
 */
export const Bean: BeanDecorator = createDecorator<BeanMetadata>('Bean', {
    props: (provide: Token, options?: UseAsStatic) => ({ ...options, provide }),
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
    (option?: PatternMetadata): ClassDecorator;
}

/**
 * `Configuartion` decorator, define the class as auto Configuration provider.
 * @Configuartion
 */
export const Configuration: ConfigurationDecorator = createDecorator<InjectableMetadata>('Configuration', {
    actionType: [ActionTypes.annoation],
    design: {
        afterAnnoation: (ctx, next) => {
            const { class: typeRef, injector } = ctx;

            const factory = injector.get(ReflectiveFactory).create(typeRef, injector);
            const pdrs = typeRef.defs.filter(d => d.decor === Bean)
                .map(d => {
                    const key = d.propertyKey;
                    const { provide, static: stac } = d.metadata as BeanMetadata;
                    if (d.decorType === 'method') {
                        return {
                            provide,
                            useFactory: () => factory.invoke(key),
                            static: stac,
                        } as ProviderType
                    } else {
                        return {
                            provide,
                            useFactory: () => factory.getInstance()[key],
                            static: stac,
                        } as ProviderType
                    }
                });
            injector.inject(pdrs);
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
    <TArg>(option?: EndpointOptions<TArg>): MethodDecorator;
    /**
     * `EventHandler` dectorator, event message handle. use to handle event message of {@link  ApplicationEventPublisher}.
     *
     * @param {Type} event message match pattern.
     * @param {order?: number } option message match option.
     */
    <TArg>(event: Type<ApplicationEvent>, option?: EndpointOptions<TArg>): MethodDecorator;
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
                const factory = injector.get(EndpointFactoryResolver).resolve(typeRef, injector);
                const multicaster = injector.get(ApplicationEventMulticaster);
                decors.forEach(decor => {
                    const { filter, order, ...options } = decor.metadata;

                    const endpoint = factory.create(decor.propertyKey, options);

                    const event = filter ?? defaultFilter;
                    const isFILO = isFunction(event.getStrategy) && event.getStrategy() == 'FILO';
                    multicaster.addListener(event, endpoint, isFILO ? order ?? 0 : order);
                    factory.onDestroy(() => multicaster.removeListener(event, endpoint))
                });
                next()
            }
        },
        runtime: {
            method: (ctx, next) => {
                const typeRef = ctx.class;
                if (!runtime && typeRef.getAnnotation().static === true || typeRef.getAnnotation().singleton) return next();
                if (!runtime && !ctx.context?.isResolve) return next();
                const decors = typeRef.methodDefs.get(ctx.currDecor.toString()) ?? EMPTY;
                const injector = ctx.injector;
                const factory = injector.get(EndpointFactoryResolver).resolve(typeRef, injector);
                const multicaster = injector.get(ApplicationEventMulticaster);
                decors.forEach(decor => {
                    const { filter, order, ...options } = decor.metadata;

                    const endpoint = factory.create(decor.propertyKey, { ...options, instance: ctx.instance! });

                    const event = filter ?? defaultFilter;
                    const isFILO = isFunction(event.getStrategy) && event.getStrategy() == 'FILO';
                    multicaster.addListener(event, endpoint, isFILO ? order ?? 0 : order);
                    factory.onDestroy(() => multicaster.removeListener(event, endpoint))
                });
                next()
            }
        }
    })
}

/**
 * event hander.
 * @EventHandler
 */
export const EventHandler: EventHandler = createEventHandler(PayloadApplicationEvent, 'EventHandler', true);


/**
 * event handler metadata.
 */
export interface EventHandlerMetadata<TArg> extends EndpointOptions<TArg> {
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
     * @param {EndpointOptions} option message match option.
     */
    <TArg>(option?: EndpointOptions<TArg>): MethodDecorator;
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
     * @param {EndpointOptions} option message match option.
     */
    <TArg>(option?: EndpointOptions<TArg>): MethodDecorator;
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
     * @param {EndpointOptions} option message match option.
     */
    <TArg>(option?: EndpointOptions<TArg>): MethodDecorator;
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
     * @param {EndpointOptions} option message match option.
     */
    <TArg>(option?: EndpointOptions<TArg>): MethodDecorator;
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
     * @param {EndpointOptions} option message match option.
     */
    <TArg>(option?: EndpointOptions<TArg>): MethodDecorator;
}

/**
 * Application Shutdown event hander.
 * rasie after `ApplicationShutdownEvent`
 * @Dispose
 */
export const Dispose: DisposeEventHandler = createEventHandler(ApplicationDisposeEvent, 'Dispose', true);


/**
 * Endpoint handler metadata.
 */
export interface EndpointHandlerMetadata<TArg> extends EndpointOptions<TArg> {
    /**
     * execption type.
     */
    filter: Type | string;
}



/**
 * EndpointHanlder decorator, for class. use to define the class as response handle register in global Endpoint filter.
 *
 * @export
 * @interface EndpointHanlder
 */
export interface EndpointHanlder {
    /**
     * message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {Type} filter message match pattern.
     * @param {order?: number } option message match option.
     */
    <TArg = any>(filter: Type | string, option?: EndpointOptions<TArg>): MethodDecorator;
}

/**
 * EndpointHanlder decorator, for class. use to define the class as Endpoint handle register in global Endpoint filter.
 * @EndpointHanlder
 * 
 * @exports {@link EndpointHanlder}
 */
export const EndpointHanlder: EndpointHanlder = createDecorator('EndpointHanlder', {
    props: (filter?: Type | string, options?: { order?: number }) => ({ filter, ...options }),
    design: {
        method: (ctx, next) => {
            const typeRef = ctx.class;
            const decors = typeRef.getDecorDefines<EndpointHandlerMetadata<any>>(ctx.currDecor, Decors.method);
            const injector = ctx.injector;
            const factory = injector.get(EndpointFactoryResolver).resolve(typeRef, injector);
            const handlerResolver = injector.get(FilterHandlerResolver);
            decors.forEach(decor => {
                const { filter, order, ...options } = decor.metadata;
                const endpoint = factory.create(decor.propertyKey, options);
                handlerResolver.addHandle(filter, endpoint, order);
                factory.onDestroy(() => handlerResolver.removeHandle(filter, endpoint));
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
    <TArg = any>(execption: Type<Error>, option?: EndpointOptions<TArg>): MethodDecorator;
}

/**
 * ExecptionHandler decorator, for class. use to define the class as execption handle register in global execption filter.
 * @ExecptionHandler
 * 
 * @exports {@link ExecptionHandler}
 */
export const ExecptionHandler: ExecptionHandler = EndpointHanlder;


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
export interface BeanMetadata extends UseAsStatic {
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


