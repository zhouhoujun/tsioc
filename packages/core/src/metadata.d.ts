import { AbstractType, InjectableMetadata, MethodPropDecorator, Token, Parameter, UseAsStatic, ModuleType, Type, MutilProvider, ProvidedInMetadata, AnnotationMetadata } from '@tsdi/ioc';
import { PipeTransform } from './pipes/pipe';
import { FilterFn } from './filters/filter';
import { InvocationHandlerOptions } from './invocation';
import { ApplicationEvent } from './ApplicationEvent';
import { TransportParameter } from './handlers/resolver';
import { InterceptorFn } from './interceptor';
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
     * @param {InvokeOptions} [args] the method invoke arguments {@link InvokeOptions}.
     */
    <TArg>(args?: InvocationHandlerOptions<TArg>): MethodDecorator;
}
/**
 * @Runner decorator.
 */
export declare const Runner: Runner;
/**
 * pipe decorator.
 */
export type PipeDecorator = <TFunction extends AbstractType<PipeTransform>>(target: TFunction) => TFunction | void;
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
     * @param {AbstractType} selector the transform selector.
     * @param {boolean} pure If Pipe is pure (its output depends only on its input.) defaut true.
     */
    (selector: string, pure?: boolean): PipeDecorator;
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
export declare const Pipe: Pipe;
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
export declare const Bean: BeanDecorator;
export interface ConfgiurationMetadata extends InjectableMetadata {
    /**
     * imports dependens modules
     *
     * @type {Modules[]}
     */
    imports?: ModuleType<Type>[];
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
export declare const Configuration: ConfigurationDecorator;
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
     * @param {AbstractType} event message match pattern.
     * @param {order?: number } option message match option.
     */
    (event: AbstractType<ApplicationEvent>, option?: InvocationHandlerOptions): MethodDecorator;
}
/**
 * event hander.
 * handle method return false, stop event loop.
 * @EventHandler
 */
export declare const EventHandler: EventHandler;
/**
 * event handler metadata.
 */
export interface EventHandlerMetadata<TArg> extends InvocationHandlerOptions<TArg> {
    /**
     * execption type.
     */
    filter: AbstractType;
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
export declare const Startup: StartEventHandler;
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
export declare const Start: StartEventHandler;
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
export declare const Started: StartedEventHandler;
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
export declare const Shutdown: ShutdownEventHandler;
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
export declare const Dispose: DisposeEventHandler;
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
export type InterceptDecorator = <T extends InterceptorFn>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T> | void;
/**
 * Interceptable
 */
export interface Interceptable {
    /**
     * Interceptable decorator, for class. use to define the class as interceptor register in global interceptor.
     *
     * @param {AbstractType} target intercept target.
     * @param  {Omit<InterceptMetadata, 'target'>} option intercept options.
     */
    (target: AbstractType | string, option?: Omit<InterceptMetadata, 'target'>): InterceptDecorator;
}
/**
 * Interceptable decorator, for class. use to define the class as interceptor register in global interceptor.
 * @Interceptable
 *
 * @exports {@link Interceptable}
 */
export declare const Interceptable: Interceptable;
export type FilterDecorator = <T extends FilterFn>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T> | void;
/**
 * Filterable
 */
export interface Filterable {
    /**
     * Filterable decorator, for class. use to define the class as filter register in global filter.
     *
     * @param {AbstractType} target filter target.
     * @param { Omit<InterceptMetadata, 'filter'>} option filter options.
     */
    (target: AbstractType | string, option?: Omit<InterceptMetadata, 'target'>): FilterDecorator;
}
/**
 * Filterable decorator, for class. use to define the class as filter register in global filter.
 * @Filterable
 *
 * @exports {@link Filterable}
 */
export declare const Filterable: Filterable;
/**
 * Filter handler metadata.
 */
export interface FilterHandlerMetadata<TArg> extends InvocationHandlerOptions<TArg> {
    /**
     * filter type.
     */
    filter: AbstractType | string;
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
     * @param {AbstractType} filter message match pattern.
     * @param {order?: number } option message match option.
     */
    <TArg = any>(filter: AbstractType | string, option?: InvocationHandlerOptions<TArg>): MethodDecorator;
}
/**
 * FilterHandler decorator, for class. use to define the class as handler handle register in global filter.
 * @FilterHandler
 *
 * @exports {@link FilterHandler}
 */
export declare const FilterHandler: FilterHandler;
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
    (execption: AbstractType<Error>, option?: InvocationHandlerOptions): MethodDecorator;
}
/**
 * ExceptionHandler decorator, for class. use to define the class as execption handle register in global execption filter.
 * @ExceptionHandler
 *
 * @exports {@link ExceptionHandler}
 */
export declare const ExceptionHandler: ExceptionHandler;
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
    type?: AbstractType;
    /**
     * selector of pipe.
     */
    selector: string;
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
    (field?: string, option?: Omit<TransportParameter, 'target' | 'propertyKey' | 'field'>): ParameterDecorator;
    /**
     * Transport Parameter decorator
     * @param meta.
     */
    (meta: Omit<TransportParameter, 'target' | 'propertyKey'>): ParameterDecorator;
}
/**
 * Subscribe payload param decorator.
 *
 * @exports {@link TransportParameterDecorator}
 */
export declare const Payload: TransportParameterDecorator;
/**
 * Subscribe topic param decorator.
 *
 * @exports {@link TransportParameterDecorator}
 */
export declare const Topic: TransportParameterDecorator;
