import { Abstract } from '@tsdi/ioc';
import { Observable, Subject, Subscription } from 'rxjs';



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
 * Interface to be implemented by application event listeners.
 */
export interface ApplicationListener<T extends ApplicationEvent = ApplicationEvent> {

	/**
	 * Handle an application event.
	 * @param event the event to respond to,
     * @returns type of {@link Subcription}, Represents a disposable resource, such as the execution of an Observable. A
     * Subscription has one important method, `unsubscribe`, that takes no argument
     * and just disposes the resource held by the subscription.
	 */
	onApplicationEvent(event: Observable<T>): Subscription;
}


/**
 * providing the basic listener registration facility.
 */
@Abstract()
export abstract class ApplicationEventMulticaster extends Subject<ApplicationEvent> {
    /**
     * multicast emit event.
     * @param event 
     */
    abstract emit(event: ApplicationEvent): void;

}
