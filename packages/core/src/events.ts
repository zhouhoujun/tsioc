import { getClass } from '@tsdi/ioc';
import { ApplicationEvent } from './ApplicationEvent';
import { ApplicationContext } from './ApplicationContext';


/**
 * payload application event.
 */
export class PayloadApplicationEvent<T = any> extends ApplicationEvent {

    constructor(source: Object, public payload: T) {
        super(source)
    }

    getPayloadType() {
        return getClass(this.payload)
    }
}

/**
 * Application start event.
 */
export class ApplicationStartEvent extends ApplicationEvent {

}

/**
 * Application start event.
 */
export class ApplicationStartedEvent extends ApplicationEvent {

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


