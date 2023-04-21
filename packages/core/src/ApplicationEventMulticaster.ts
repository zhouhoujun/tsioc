import { Abstract, StaticProvider, Type, ProvdierOf, Token } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { ApplicationEvent } from './ApplicationEvent';
import { ApplicationEventPublisher } from './ApplicationEventPublisher';
import { Filter } from './filters/filter';
import { CanActivate } from './guard';
import { Handler } from './Handler';
import { Interceptor } from './Interceptor';
import { PipeTransform } from './pipes/pipe';
import { EndpointContext } from './endpoints/context';
import { EndpointService } from './endpoints/endpoint.service';


/**
 * Application event context.
 */
export class ApplicationEventContext extends EndpointContext<ApplicationEvent> {

    override isSelf(token: Token) {
        return token === ApplicationEventContext;
    }
}

/**
 * providing the basic listener registration facility.
 */
@Abstract()
export abstract class ApplicationEventMulticaster implements EndpointService, ApplicationEventPublisher {
    /**
     * use pipes.
     * @param guards 
     */
    abstract usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this;
    /**
     * use guards.
     * @param guards 
     */
    abstract useGuards(guards: ProvdierOf<CanActivate> | ProvdierOf<CanActivate>[]): this;
    /**
     * use interceptor
     * @param interceptor 
     * @param order 
     */
    abstract useInterceptors(interceptor: ProvdierOf<Interceptor<ApplicationEventContext, any>> | ProvdierOf<Interceptor<ApplicationEventContext, any>>[], order?: number): this;
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
    abstract addListener(event: Type<ApplicationEvent>, handler: Handler, order?: number): this;
    /**
     * add event handler.
     * @param event 
     * @param handler 
     */
    abstract removeListener(event: Type<ApplicationEvent>, handler: Handler): this;
    /**
     * multicast emit event.
     * @param event 
     */
    abstract emit(event: ApplicationEvent): Observable<any>;

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
    abstract publishEvent(event: ApplicationEvent | Object): Observable<any>;


    abstract clear(): void;

}
