import { AbstractType, ProvdierOf, HandlerLike, noPointcut } from '@tsdi/ioc';
import { ApplicationEvent } from './ApplicationEvent';
import { ApplicationEventPublisher } from './ApplicationEventPublisher';
import { Interceptor, InterceptorFn, InterceptorLike } from './interceptor';
import { HandlerAppendService, HandlerOptions } from './handlers/configable';
import { RunContext } from './handler';
export type EventInterceptor<TInput extends ApplicationEvent = ApplicationEvent> = Interceptor<TInput, any, RunContext>;
export type EventInterceptorFn<TInput extends ApplicationEvent = ApplicationEvent> = InterceptorFn<TInput, any, RunContext>;
export type EventInterceptorLike<TInput extends ApplicationEvent = ApplicationEvent> = InterceptorLike<TInput, any, RunContext>;
/**
 * providing the basic listener registration facility.
 *
 * 提供基本的事件侦听器注册工具。
 */
export declare abstract class ApplicationEventMulticaster implements HandlerAppendService<ApplicationEvent, any, RunContext>, ApplicationEventPublisher {
    static [noPointcut]: boolean;
    /**
     * parent eventMulticaster
     */
    abstract get parent(): ApplicationEventMulticaster | null;
    /**
     * attach child eventMulticaster
     * @param eventMulticaster
     */
    abstract attach(eventMulticaster: ApplicationEventMulticaster): this;
    /**
     * detach child eventMulticaster
     * @param eventMulticaster
     */
    abstract detach(eventMulticaster: ApplicationEventMulticaster): this;
    /**
     * use interceptor for this handler.
     * @param inteceptor
     * @param order mutil order
     */
    abstract use(inteceptor: ProvdierOf<EventInterceptorLike>, order?: number): this;
    /**
     * use interceptor for this handler.
     * @param inteceptors
     */
    abstract use(inteceptors: ProvdierOf<EventInterceptorLike>[]): this;
    /**
     * use and append hanlder options.
     * @param options
     */
    abstract use(options: HandlerOptions<ApplicationEvent, any, RunContext>): this;
    /**
     * add event handler.
     * @param event
     * @param handler
     */
    abstract addListener(event: AbstractType<ApplicationEvent>, handler: HandlerLike, order?: number): this;
    /**
     * add event handler.
     * @param event
     * @param handler
     */
    abstract removeListener(event: AbstractType<ApplicationEvent>, handler: HandlerLike): this;
    /**
     * emit event. ailas name of publishEvent
     * @param event the event to publish
     */
    abstract emit(event: ApplicationEvent | Object): Promise<void | false>;
    /**
     * event downward
     * @param event
     */
    abstract downward(event: ApplicationEvent, context: RunContext): Promise<void | false>;
    /**
     * event bubble up
     * @param event
     */
    abstract bubbleup(event: ApplicationEvent, context: RunContext): Promise<void | false>;
    /**
     * Notify all <strong>matching</strong> listeners registered with this
     * application of an application event. Events may be framework events
     * (such as ContextRefreshedEvent) or application-specific events.
     * <p>Such an event publication step is effectively a hand-off to the
     * multicaster and does not imply synchronous/asynchronous execution
     * or even immediate execution at all. Event listeners are encouraged
     * to be as efficient as possible, individually using asynchronous
     * execution for longer-running and potentially blocking operations.
     * @param event the event to publish
     */
    abstract publishEvent(event: ApplicationEvent | Object, context?: RunContext): Promise<void | false>;
    abstract clear(): void;
}
