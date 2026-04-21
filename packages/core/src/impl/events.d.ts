import { HandlerLike, Injector, ProvdierOf, AbstractType, ContextToken, HandleResult } from '@tsdi/ioc';
import { CanHandle } from '../guard';
import { Interceptor } from '../interceptor';
import { Handler, RunContext } from '../handler';
import { Filter } from '../filters/filter';
import { ConfigableHandler } from '../handlers/configable.impl';
import { ApplicationEvent } from '../ApplicationEvent';
import { ApplicationEventMulticaster, EventInterceptorLike } from '../ApplicationEventMulticaster';
import { HandlerOptions } from '../handlers';
/**
 *  event multicaster interceptors multi token.
 */
export declare const EVENT_MULTICASTER_INTERCEPTORS: import("@tsdi/ioc").InjectToken<Interceptor<ApplicationEvent, any, any>[]>;
/**
 *  event multicaster filters multi token.
 */
export declare const EVENT_MULTICASTER_FILTERS: import("@tsdi/ioc").InjectToken<Filter<any, any, any>[]>;
/**
 *  event multicaster hanlder multi token.
 */
export declare const EVENT_MULTICASTER_BACKEND: import("@tsdi/ioc").InjectToken<HandlerLike[]>;
/**
 *  event multicaster guards multi token.
 */
export declare const EVENT_MULTICASTER_GUARDS: import("@tsdi/ioc").InjectToken<CanHandle<any, any>[]>;
export declare const WITH_SELF: ContextToken<boolean>;
export declare class DefaultEventMulticaster extends ApplicationEventMulticaster implements Handler<ApplicationEvent> {
    private injector;
    private _handler;
    private maps;
    protected _children: ApplicationEventMulticaster[];
    readonly parent: ApplicationEventMulticaster | null;
    constructor(injector: Injector);
    get handler(): ConfigableHandler<ApplicationEvent>;
    attach(eventMulticaster: ApplicationEventMulticaster): this;
    detach(eventMulticaster: ApplicationEventMulticaster): this;
    use(options: ProvdierOf<EventInterceptorLike> | ProvdierOf<EventInterceptorLike>[] | HandlerOptions<ApplicationEvent>, order?: number): this;
    addListener(event: AbstractType<ApplicationEvent>, handler: HandlerLike, order?: number): this;
    removeListener(event: AbstractType<ApplicationEvent>, handler: Handler): this;
    emit(event: ApplicationEvent): Promise<void | false>;
    emit(event: Object): Promise<void | false>;
    publishEvent(event: ApplicationEvent, context?: RunContext): Promise<void | false>;
    publishEvent(event: Object, context?: RunContext): Promise<void | false>;
    downward(event: ApplicationEvent, context: RunContext): Promise<void | false>;
    bubbleup(event: ApplicationEvent, context: RunContext): Promise<void | false>;
    handle(event: ApplicationEvent, context: RunContext): HandleResult<void | false>;
    clear(): void;
}
