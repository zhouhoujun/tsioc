import {
    isUndefined, lang, Type, createDecorator, ProviderType, InjectableMetadata, PropertyMetadata, ActionTypes,
    ReflectiveFactory, MethodPropDecorator, Token, ArgumentExecption, object2string, InvokeArguments,
    isString, Parameter, TypeDef, ProviderMetadata, TypeMetadata, ProvidersMetadata, PatternMetadata,  Decors, pomiseOf
} from '@tsdi/ioc';
import { PipeTransform } from './pipes/pipe';
import { CanActivate } from './guard';
import { ApplicationEvent, ApplicationEventMulticaster, PayloadApplicationEvent } from './events';
import { FilterEndpoint } from './filters/endpoint';


/**
 * Runner option.
 */
export interface RunnerOption extends InvokeArguments {
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
    (args?: InvokeArguments): MethodDecorator;
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

export interface EventHandler {

    /**
     * payload message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {order?: number } option message match option.
     */
    (option?: {
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * order.
         */
        order?: number;
    }): MethodDecorator;
    /**
     * message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {Type} event message match pattern.
     * @param {order?: number } option message match option.
     */
    (event: Type<ApplicationEvent>, option?: {
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * order.
         */
        order?: number;
    }): MethodDecorator;
}

export const EventHandler: EventHandler = createDecorator('EventHandler', {
    props: (filter?: Type | string, options?: { order?: number }) => ({ filter, ...options }),
    design: {
        method: (ctx, next) => {
            const typeRef = ctx.class;
            const decors = typeRef.getDecorDefines<EventHandlerMetadata>(ctx.currDecor, Decors.method);
            const injector = ctx.injector;
            const factory = injector.get(ReflectiveFactory).create(typeRef, injector);
            decors.forEach(decor => {
                const { filter, order, guards } = decor.metadata;

                const invoker = factory.createInvoker(decor.propertyKey, true);
                // const invoker = factory.createInvoker(decor.propertyKey, true, async (ctx, run) => {
                //     if (guards && guards.length) {
                //         if (!(await lang.some(
                //             guards.map(token => () => pomiseOf(factory.resolve(token)?.canActivate(ctx))),
                //             vaild => vaild === false))) {
                //             return;
                //         }
                //     }
                //     return run(ctx);
                // });
                const endpoint = new FilterEndpoint(factory.injector, )

                injector.get(ApplicationEventMulticaster).addListener(filter ?? PayloadApplicationEvent, invoker, order)
            });

            next()
        }
    }
});


/**
 * event handler metadata.
 */
export interface EventHandlerMetadata {
    /**
     * execption type.
     */
    filter: Type;
    /**
     * order.
     */
    order?: number;
    /**
     * route guards.
     */
    guards?: Type<CanActivate>[];
}


/**
 * scan def.
 */
export interface ScanDef extends TypeDef {
    order?: number;
}

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
