import { Abstract, getClass, InvokerLike, Type, TypeOf } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { ApplicationContext } from './context';
import { Filter } from './filters';
import { Interceptor } from './Interceptor';



/**
 * Class to be extended by all application events. Abstract as it
 * doesn't make sense for generic events to be published directly.
 */
@Abstract()
export abstract class ApplicationEvent {
    private _timestamp: number;
    constructor(private _source: Object) {
        this._timestamp = Date.now() / 1000
    }
    /**
     * event source target.
     */
    getSource(): Object {
        return this._source
    }
    /**
     * get the time in milliseconds when the event occurred.
     */
    getTimestamp(): number {
        return this._timestamp
    }
}


export class PayloadApplicationEvent<T = any> extends ApplicationEvent {

    constructor(source: Object, public playload: T) {
        super(source)
    }

    getPayloadType() {
        return getClass(this.playload)
    }
}

/**
 * Application starting event.
 */
export class ApplicationStartingEvent extends ApplicationEvent {

}

/**
 * Application start event.
 */
export class ApplicationStartEvent extends ApplicationEvent {

}

/**
 * Application context refresh event.
 */
export class ApplicationContextRefreshEvent extends ApplicationEvent {

    constructor(readonly context: ApplicationContext) {
        super(context);
    }
}

/**
 * Application shutdown event.
 */
export class ApplicationShutdownEvent extends ApplicationEvent {
    constructor(source: Object, readonly signls?: string) {
        super(source)
    }
}


/**
 * Application dispose event.
 */
export class ApplicationDisposeEvent extends ApplicationEvent {
    constructor(source: Object) {
        super(source)
    }
}



/**
 * Interface that encapsulates event publication functionality.
 *
 * <p>Serves as a super-interface for {@link ApplicationContext}.
 */
export interface ApplicationEventPublisher {
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
    publishEvent(event: ApplicationEvent | Object): void;

}


/**
 * providing the basic listener registration facility.
 */
@Abstract()
export abstract class ApplicationEventMulticaster {

    /**
     * use interceptor
     * @param interceptor 
     * @param order 
     */
    abstract useInterceptor(interceptor: TypeOf<Interceptor<ApplicationEvent, any>>, order?: number): this;
    /**
     * use filter
     * @param filter 
     * @param order 
     */
    abstract useFilter(filter: TypeOf<Filter>, order?: number): this;
    /**
     * add event listener.
     * @param event 
     * @param invoker 
     */
    abstract addListener(event: Type<ApplicationEvent>, invoker: InvokerLike, order?: number): this;
    /**
     * multicast emit event.
     * @param event 
     */
    abstract emit(event: ApplicationEvent): Observable<any>;


    abstract clear(): void;

}
