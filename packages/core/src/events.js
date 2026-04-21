"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationDisposeEvent = exports.ApplicationShutdownEvent = exports.ApplicationStartedEvent = exports.ApplicationStartEvent = exports.ApplicationStartupEvent = exports.ApplicationContextRefreshEvent = exports.PayloadApplicationEvent = void 0;
const ioc_1 = require("@tsdi/ioc");
const ApplicationEvent_1 = require("./ApplicationEvent");
/**
 * payload application event.
 */
class PayloadApplicationEvent extends ApplicationEvent_1.ApplicationEvent {
    constructor(source, payload) {
        super(source);
        this.payload = payload;
    }
    getPayloadType() {
        return (0, ioc_1.getType)(this.payload);
    }
}
exports.PayloadApplicationEvent = PayloadApplicationEvent;
/**
 * Application context refresh event.
 */
class ApplicationContextRefreshEvent extends ApplicationEvent_1.ApplicationEvent {
    /**
     * Application context refresh event.
     * @param context
     */
    constructor(context) {
        super(context);
        this.context = context;
    }
}
exports.ApplicationContextRefreshEvent = ApplicationContextRefreshEvent;
/**
 * Application startup event.
 * setup dependences.
 * rasie after `ApplicationContextRefreshEvent`
 */
class ApplicationStartupEvent extends ApplicationEvent_1.ApplicationEvent {
    /**
     * Application startup event.
     * setup dependences.
     * rasie after `ApplicationContextRefreshEvent`
     */
    constructor(source) {
        super(source);
    }
}
exports.ApplicationStartupEvent = ApplicationStartupEvent;
/**
 * Application start event.
 * rasie after `ApplicationStartupEvent`
 */
class ApplicationStartEvent extends ApplicationEvent_1.ApplicationEvent {
    /**
     * Application start event.
     * rasie after `ApplicationStartupEvent`
     */
    constructor(source) {
        super(source);
    }
}
exports.ApplicationStartEvent = ApplicationStartEvent;
/**
 * Application started event.
 * rasie after `ApplicationStartEvent`
 */
class ApplicationStartedEvent extends ApplicationEvent_1.ApplicationEvent {
    /**
     * Application started event.
     * rasie after `ApplicationStartEvent`
     */
    constructor(source) {
        super(source);
    }
}
exports.ApplicationStartedEvent = ApplicationStartedEvent;
/**
 * Application shutdown event.
 * rasie after Application close.
 */
class ApplicationShutdownEvent extends ApplicationEvent_1.ApplicationEvent {
    /**
     * Application shutdown event.
     * rasie after Application close.
     * @param source
     * @param signls
     */
    constructor(source, signls) {
        super(source);
        this.signls = signls;
    }
    /**
     * run handles strategy, `FIFO` or `FILO`.
     * @returns
     */
    static getStrategy() {
        return 'FILO';
    }
}
exports.ApplicationShutdownEvent = ApplicationShutdownEvent;
/**
 * Application dispose event.
 * rasie after `ApplicationShutdownEvent`
 */
class ApplicationDisposeEvent extends ApplicationEvent_1.ApplicationEvent {
    /**
     * Application dispose event.
     * rasie after `ApplicationShutdownEvent`
     */
    constructor(source) {
        super(source);
    }
    /**
     * run handles strategy, `FIFO` or `FILO`.
     * @returns
     */
    static getStrategy() {
        return 'FILO';
    }
}
exports.ApplicationDisposeEvent = ApplicationDisposeEvent;
//# sourceMappingURL=events.js.map