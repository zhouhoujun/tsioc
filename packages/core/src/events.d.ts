import { ApplicationEvent } from './ApplicationEvent';
import { ApplicationContext } from './ApplicationContext';
/**
 * payload application event.
 */
export declare class PayloadApplicationEvent<T = any> extends ApplicationEvent {
    payload: T;
    constructor(source: Object, payload: T);
    getPayloadType(): import("@tsdi/ioc").Type<any>;
}
/**
 * Application context refresh event.
 */
export declare class ApplicationContextRefreshEvent extends ApplicationEvent {
    readonly context: ApplicationContext;
    /**
     * Application context refresh event.
     * @param context
     */
    constructor(context: ApplicationContext);
}
/**
 * Application startup event.
 * setup dependences.
 * rasie after `ApplicationContextRefreshEvent`
 */
export declare class ApplicationStartupEvent extends ApplicationEvent {
    /**
     * Application startup event.
     * setup dependences.
     * rasie after `ApplicationContextRefreshEvent`
     */
    constructor(source: Object);
}
/**
 * Application start event.
 * rasie after `ApplicationStartupEvent`
 */
export declare class ApplicationStartEvent extends ApplicationEvent {
    /**
     * Application start event.
     * rasie after `ApplicationStartupEvent`
     */
    constructor(source: Object);
}
/**
 * Application started event.
 * rasie after `ApplicationStartEvent`
 */
export declare class ApplicationStartedEvent extends ApplicationEvent {
    /**
     * Application started event.
     * rasie after `ApplicationStartEvent`
     */
    constructor(source: Object);
}
/**
 * Application shutdown event.
 * rasie after Application close.
 */
export declare class ApplicationShutdownEvent extends ApplicationEvent {
    readonly signls?: string | undefined;
    /**
     * Application shutdown event.
     * rasie after Application close.
     * @param source
     * @param signls
     */
    constructor(source: Object, signls?: string | undefined);
    /**
     * run handles strategy, `FIFO` or `FILO`.
     * @returns
     */
    static getStrategy(): 'FIFO' | 'FILO';
}
/**
 * Application dispose event.
 * rasie after `ApplicationShutdownEvent`
 */
export declare class ApplicationDisposeEvent extends ApplicationEvent {
    /**
     * Application dispose event.
     * rasie after `ApplicationShutdownEvent`
     */
    constructor(source: Object);
    /**
     * run handles strategy, `FIFO` or `FILO`.
     * @returns
     */
    static getStrategy(): 'FIFO' | 'FILO';
}
