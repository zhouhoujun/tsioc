import { Abstract, StaticProvider, AbstractType, ProvdierOf, HandlerLike, noPointcut } from '@tsdi/ioc';
import { ApplicationEvent } from './ApplicationEvent';
import { ApplicationEventPublisher } from './ApplicationEventPublisher';
import { Filter } from './filters/filter';
import { CanHandle } from './guard';
import { ApplicationInterceptor, ApplicationInterceptorFn, ApplicationInterceptorLike } from './ApplicationInterceptor';
import { PipeTransform } from './pipes/pipe';
import { HandlerService } from './handlers/configable';
import { RunableContext } from './ApplicationHandler';


export type EventInterceptor<TInput extends ApplicationEvent = ApplicationEvent> = ApplicationInterceptor<TInput, any, RunableContext>;
export type EventInterceptorFn<TInput extends ApplicationEvent = ApplicationEvent> = ApplicationInterceptorFn<TInput, any, RunableContext>;
export type EventInterceptorLike<TInput extends ApplicationEvent = ApplicationEvent> = ApplicationInterceptorLike<TInput, any, RunableContext>;

/**
 * providing the basic listener registration facility.
 * 
 * 提供基本的事件侦听器注册工具。
 */
@Abstract()
export abstract class ApplicationEventMulticaster implements HandlerService, ApplicationEventPublisher {

    static [noPointcut] = true;

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
     * use pipes.
     * @param guards 
     */
    abstract usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this;
    /**
     * use guards.
     * @param guards 
     */
    abstract useGuards(guards: ProvdierOf<CanHandle> | ProvdierOf<CanHandle>[]): this;
    /**
     * use interceptor
     * @param interceptor 
     * @param order 
     */
    abstract useInterceptors(interceptor: ProvdierOf<EventInterceptorLike> | ProvdierOf<EventInterceptorLike>[], order?: number): this;
    /**
     * use filter
     * @param filter 
     * @param order 
     */
    abstract useFilters(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number): this;
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
    abstract downward(event: ApplicationEvent, context: RunableContext): Promise<void | false>;
    /**
     * event bubble up
     * @param event 
     */
    abstract bubbleup(event: ApplicationEvent, context: RunableContext): Promise<void | false>;
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
    abstract publishEvent(event: ApplicationEvent | Object, context?: RunableContext): Promise<void | false>;


    abstract clear(): void;

}
