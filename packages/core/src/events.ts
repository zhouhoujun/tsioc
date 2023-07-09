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
 * Application context refresh event.
 */
export class ApplicationContextRefreshEvent extends ApplicationEvent {
    /**
     * Application context refresh event.
     * @param context 
     */
    constructor(readonly context: ApplicationContext) {
        super(context);
    }
}

/**
 * Application startup event.
 * setup dependences. 
 * rasie after `ApplicationContextRefreshEvent`
 */
export class ApplicationStartupEvent extends ApplicationEvent {

    /**
     * Application startup event.
     * setup dependences. 
     * rasie after `ApplicationContextRefreshEvent`
     */
    constructor(source: Object) {
        super(source)
    }
}

/**
 * Application start event.
 * rasie after `ApplicationStartupEvent`
 */
export class ApplicationStartEvent extends ApplicationEvent {

    /**
     * Application start event.
     * rasie after `ApplicationStartupEvent`
     */
    constructor(source: Object) {
        super(source)
    }
}

/**
 * Application started event.
 * rasie after `ApplicationStartEvent`
 */
export class ApplicationStartedEvent extends ApplicationEvent {

    /**
     * Application started event.
     * rasie after `ApplicationStartEvent`
     */
    constructor(source: Object) {
        super(source)
    }
}


/**
 * Application shutdown event.
 * rasie after Application close.
 */
export class ApplicationShutdownEvent extends ApplicationEvent {

    /**
     * Application shutdown event.
     * rasie after Application close.
     * @param source 
     * @param signls 
     */
    constructor(source: Object, readonly signls?: string) {
        super(source)
    }
    
    override getStrategy(): 'FIFO' | 'FILO' {
        return 'FILO'
    }
}


/**
 * Application dispose event.
 * rasie after `ApplicationShutdownEvent`
 */
export class ApplicationDisposeEvent extends ApplicationEvent {
    /**
     * Application dispose event.
     * rasie after `ApplicationShutdownEvent`
     */
    constructor(source: Object) {
        super(source)
    }

    override getStrategy(): 'FIFO' | 'FILO' {
        return 'FILO'
    }
}


