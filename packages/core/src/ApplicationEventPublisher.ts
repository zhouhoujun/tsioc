import { Observable } from 'rxjs';
import { ApplicationEvent } from './ApplicationEvent';


/**
 * Interface that encapsulates event publication functionality.
 *
 * 事件发布功能的接口。
 * <p>Serves as a super-interface for {@link ApplicationContext}.</p>
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
    publishEvent(event: ApplicationEvent | Object): Observable<any>;

}
