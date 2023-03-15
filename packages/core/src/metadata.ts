import {
    isUndefined, Type, createDecorator, ProviderType, InjectableMetadata, PropertyMetadata, ActionTypes,
    ReflectiveFactory, MethodPropDecorator, Token, ArgumentExecption, object2string, InvokeArguments,
    isString, Parameter, ProviderMetadata, Decors, TypeOf
} from '@tsdi/ioc';
import { PipeTransform } from './pipes/pipe';
import { CanActivate } from './guard';
import {
    ApplicationDisposeEvent, ApplicationEvent, ApplicationEventMulticaster, ApplicationShutdownEvent,
    ApplicationStartedEvent, ApplicationStartEvent, PayloadApplicationEvent
} from './events';
import { FilterHandlerResolver, Respond } from './filters/filter';
import { EndpointContext } from './filters/context';
import { BootstrapOption, EndpointFactoryResolver } from './filters/endpoint.factory';
import { Interceptor } from './Interceptor';


/**
 * Runner option.
 */
export interface RunnerOption extends BootstrapOption {
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
     * @Module
     *
     * @param {string} runable the method of the class to run.
     * @param {RunnerOption} [args] the method invoke arguments {@link RunnerOption}.
     */
    (runable: string, args?: RunnerOption): ClassDecorator;

    /**
     * Runner decorator, use to define the method of class as application Runner.
     * 
     * @param {InvokeArguments} [args] the method invoke arguments {@link InvokeArguments}.
     */
    (args?: BootstrapOption): MethodDecorator;
}

/**
 * @Runner decorator.
 */
export const Runner: Runner = createDecorator('Runner', {
    actionType: 'runnable',
    props: (method: string | RunnerOption, args?: RunnerOption) =>
        (isString(method) ? { method, args } : { args: method }),

    afterInit: (ctx) => {
        const meta = ctx.define.metadata as { method: string, args: RunnerOption };
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
 * Bean decorator. bean provider, provider the value of the method or property for Confgiuration.
 */
export interface Bean {
    /**
     * Bean decorator. bean provider, provider the value of the method or property for Confgiuration.
     * @param {Token} provide the value of the method or property for the provide token.
     */
    (provide?: Token): MethodPropDecorator;
}

/**
 * Bean decorator. bean provider, provider the value of the method or property for Confgiuration.
 */
export const Bean: Bean = createDecorator<BeanMetadata>('Bean', {
    props: (provide: Token) => ({ provide }),
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
 * Configuartion decorator, define the class as auto Configuration provider.
 */
export interface Configuration {
    /**
     * Configuartion decorator, define the class as auto Configuration provider.
     * @Configuartion
     */
    (): ClassDecorator;
}

/**
 * Configuartion decorator, define the class as auto Configuration provider.
 * @Configuartion
 */
export const Configuration: Configuration = createDecorator<InjectableMetadata>('Configuration', {
    actionType: [ActionTypes.annoation],
    design: {
        afterAnnoation: (ctx, next) => {
            const { class: typeRef, injector } = ctx;

            const factory = injector.get(ReflectiveFactory).create(typeRef, injector);
            const pdrs = typeRef.decors.filter(d => d.decor === '@Bean')
                .map(d => {
                    const key = d.propertyKey;
                    const { provide } = d.metadata as BeanMetadata;
                    if (d.decorType === 'method') {
                        return {
                            provide,
                            useFactory: () => factory.invoke(key)
                        } as ProviderType
                    } else {
                        return {
                            provide,
                            useFactory: () => factory.getInstance()[key]
                        } as ProviderType
                    }
                });
            injector.inject(pdrs);
            next()
        }
    },
    appendProps: (meta) => {
        // meta.providedIn = 'configuration';
        meta.singleton = true
    }
});

/**
 * event hander.
 * @EventHandler
 */
export interface EventHandler {

    /**
     * payload message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {order?: number } option message match option.
     */
    (option?: BootstrapOption): MethodDecorator;
    /**
     * message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {Type} event message match pattern.
     * @param {order?: number } option message match option.
     */
    (event: Type<ApplicationEvent>, option?: BootstrapOption): MethodDecorator;
}

function createEventHandler(defaultFilter: Type<ApplicationEvent>, name = 'EventHandler') {
    return createDecorator(name, {
        props: (filter?: Type | string, options?: { order?: number }) => ({ filter, ...options }),
        design: {
            method: (ctx, next) => {
                const typeRef = ctx.class;
                const decors = typeRef.getDecorDefines<EventHandlerMetadata>(ctx.currDecor, Decors.method);
                const injector = ctx.injector;
                const factory = injector.get(EndpointFactoryResolver).resolve(typeRef, injector, 'event');
                const multicaster = injector.get(ApplicationEventMulticaster);
                decors.forEach(decor => {
                    const { filter, order, ...options } = decor.metadata;

                    const endpoint = factory.create(decor.propertyKey, options);

                    multicaster.addListener(filter ?? defaultFilter, endpoint, order)
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
export const EventHandler: EventHandler = createEventHandler(PayloadApplicationEvent);


/**
 * event handler metadata.
 */
export interface EventHandlerMetadata extends BootstrapOption {
    /**
     * execption type.
     */
    filter: Type;
}

/**
 * Application start event hander.
 * @Start
 */
export interface StartEventHandler {

    /**
     * Application start event handle.
     *
     * @param {BootstrapOption} option message match option.
     */
    (option?: BootstrapOption): MethodDecorator;
}

/**
 * Application start event hander.
 * @Start
 */
export const Start: StartEventHandler = createEventHandler(ApplicationStartEvent, 'Start');

/**
 * Application started event hander.
 * @Started
 */
export interface StartedEventHandler {

    /**
     * Application started event handle.
     *
     * @param {BootstrapOption} option message match option.
     */
    (option?: BootstrapOption): MethodDecorator;
}

/**
 * Application Started event hander.
 * @Start
 */
export const Started: StartedEventHandler = createEventHandler(ApplicationStartedEvent, 'Started');


/**
 * Application Shutdown event hander.
 * @Shutdown
 */
export interface ShutdownEventHandler {

    /**
     * Application Shutdown event handle.
     *
     * @param {BootstrapOption} option message match option.
     */
    (option?: BootstrapOption): MethodDecorator;
}

/**
 * Application Shutdown event hander.
 * @Shutdown
 */
export const Shutdown: ShutdownEventHandler = createEventHandler(ApplicationShutdownEvent, 'Shutdown');


/**
 * Application Dispose event hander.
 * @Dispose
 */
export interface DisposeEventHandler {

    /**
     * Application Dispose event handle.
     *
     * @param {BootstrapOption} option message match option.
     */
    (option?: BootstrapOption): MethodDecorator;
}

/**
 * Application Shutdown event hander.
 * @Dispose
 */
export const Dispose: DisposeEventHandler = createEventHandler(ApplicationDisposeEvent, 'Dispose');


/**
 * Endpoint handler metadata.
 */
export interface EndpointHandlerMetadata {
    /**
     * execption type.
     */
    filter: Type | string;
    /**
     * order.
     */
    order?: number;
    /**
     * route guards.
     */
    guards?: TypeOf<CanActivate>[];
    /**
     * interceptors of route.
     */
    interceptors?: TypeOf<Interceptor>[];
    /**
     * pipes for the route.
     */
    pipes?: TypeOf<PipeTransform>[];
    /**
     * handle expection as response type.
     */
    response?: 'body' | 'header' | 'response' | TypeOf<Respond>
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
    (filter: Type | string, option?: {

        /**
         * route guards.
         */
        guards?: TypeOf<CanActivate>[];
        /**
         * interceptors of route.
         */
        interceptors?: TypeOf<Interceptor>[];
        /**
         * pipes for the route.
         */
        pipes?: TypeOf<PipeTransform>[];
        /**
         * order.
         */
        order?: number;
        /**
         * handle expection as response type.
         */
        response?: 'body' | 'header' | 'response' | Type<Respond> | ((ctx: EndpointContext, returnning: any) => void)
    }): MethodDecorator;
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
            const decors = typeRef.getDecorDefines<EndpointHandlerMetadata>(ctx.currDecor, Decors.method);
            const injector = ctx.injector;
            const factory = injector.get(EndpointFactoryResolver).resolve(typeRef, injector, 'filter');

            decors.forEach(decor => {
                const { filter, order, ...options } = decor.metadata;
                const endpoint = factory.create(decor.propertyKey, options);
                injector.get(FilterHandlerResolver).addHandle(filter, endpoint, order)
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
    (execption: Type<Error>, option?: {
        /**
         * order.
         */
        order?: number;
        /**
         * interceptors of route.
         */
        interceptors?: TypeOf<Interceptor>[];
        /**
         * pipes for the route.
         */
        pipes?: TypeOf<PipeTransform>[];
        /**
         * handle expection as response type.
         */
        response?: 'body' | 'header' | 'response' | Type<Respond> | ((ctx: EndpointContext, returnning: any) => void)
    }): MethodDecorator;
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
export interface BeanMetadata {
    /**
     * the token bean provider to.
     */
    provide: Token;
}
