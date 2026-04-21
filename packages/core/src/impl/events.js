"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultEventMulticaster = exports.WITH_SELF = exports.EVENT_MULTICASTER_GUARDS = exports.EVENT_MULTICASTER_BACKEND = exports.EVENT_MULTICASTER_FILTERS = exports.EVENT_MULTICASTER_INTERCEPTORS = void 0;
const ioc_1 = require("@tsdi/ioc");
const handler_1 = require("../handler");
const execption_filter_1 = require("../filters/execption.filter");
const configable_impl_1 = require("../handlers/configable.impl");
const ApplicationEvent_1 = require("../ApplicationEvent");
const ApplicationEventMulticaster_1 = require("../ApplicationEventMulticaster");
const events_1 = require("../events");
const handlers_1 = require("../handlers");
/**
 *  event multicaster interceptors multi token.
 */
exports.EVENT_MULTICASTER_INTERCEPTORS = (0, ioc_1.token)('EVENT_MULTICASTER_INTERCEPTORS');
/**
 *  event multicaster filters multi token.
 */
exports.EVENT_MULTICASTER_FILTERS = (0, ioc_1.token)('EVENT_MULTICASTER_FILTERS');
/**
 *  event multicaster hanlder multi token.
 */
exports.EVENT_MULTICASTER_BACKEND = (0, ioc_1.token)('EVENT_MULTICASTER_BACKEND');
/**
 *  event multicaster guards multi token.
 */
exports.EVENT_MULTICASTER_GUARDS = (0, ioc_1.token)('EVENT_MULTICASTER_GUARDS');
exports.WITH_SELF = new ioc_1.ContextToken(() => false);
class DefaultEventMulticaster extends ApplicationEventMulticaster_1.ApplicationEventMulticaster {
    constructor(injector) {
        super();
        this.injector = injector;
        this.maps = new Map();
        this._children = [];
        this._handler = (0, configable_impl_1.createHandler)(injector, this, exports.EVENT_MULTICASTER_BACKEND, exports.EVENT_MULTICASTER_INTERCEPTORS, exports.EVENT_MULTICASTER_GUARDS, exports.EVENT_MULTICASTER_FILTERS, {
            enableTypeChain: true,
            filters: [execption_filter_1.ExceptionHandlerFilter]
        });
        this.parent = this.injector.get(ApplicationEventMulticaster_1.ApplicationEventMulticaster, null, ioc_1.InjectFlags.SkipSelf);
        if (this.parent) {
            const parent = this.parent;
            const multicaster = this;
            parent.attach(multicaster);
            injector.onDestroy(() => {
                parent.detach(multicaster);
            });
        }
    }
    get handler() {
        return this._handler;
    }
    attach(eventMulticaster) {
        if (this._children.indexOf(eventMulticaster) < 0) {
            this._children.push(eventMulticaster);
        }
        return this;
    }
    detach(eventMulticaster) {
        this._children.splice(this._children.indexOf(eventMulticaster), 1);
        return this;
    }
    use(options, order) {
        this._handler.append((0, ioc_1.isArray)(options) ? { interceptors: options }
            : (((0, handlers_1.isHandlerOptions)(options) ? options : { interceptors: [(0, ioc_1.toMutilProvdierOf)(options, order)] })));
        return this;
    }
    addListener(event, handler, order = -1) {
        const handlers = this.maps.get(event);
        if (handlers) {
            if (handlers.some(i => i.equals ? i.equals?.(handler) : i === handler))
                return this;
            order >= 0 ? handlers.splice(order, 0, handler) : handlers.push(handler);
        }
        else {
            this.maps.set(event, [handler]);
        }
        return this;
    }
    removeListener(event, handler) {
        const handlers = this.maps.get(event);
        if (handlers) {
            const idx = handlers.findIndex(i => i.equals ? i.equals?.(handler) : i === handler);
            if (idx >= 0) {
                handlers.splice(idx, 1);
            }
        }
        return this;
    }
    emit(obj) {
        return this.publishEvent(obj);
    }
    async publishEvent(obj, context) {
        if (!obj)
            throw new ioc_1.ArgumentException('Event must not be null');
        // Decorate event as an ApplicationEvent if necessary
        let event;
        if (obj instanceof ApplicationEvent_1.ApplicationEvent) {
            event = obj;
        }
        else {
            event = new events_1.PayloadApplicationEvent(this, obj);
        }
        context ?? (context = (0, handler_1.createRunContext)(this.handler.injector ?? this.injector));
        context.set(exports.WITH_SELF, true);
        let res = await this.downward(event, context);
        if (res === false || !event.propagation)
            return false;
        context.set(exports.WITH_SELF, false);
        res = await this.bubbleup(event, context);
        return res;
    }
    async downward(event, context) {
        let res;
        if (context.get(exports.WITH_SELF)) {
            res = await (0, ioc_1.toPromise)(this.handler.handle(event, context));
        }
        if (res === false || !event.propagation)
            return false;
        if (this._children.length) {
            return (0, ioc_1.toPromise)((0, ioc_1.composeHandlers)(this._children.map(r => (event, context) => r.downward(event, context)), (r, next, input, ctx) => {
                if (!event.propagation)
                    return false;
                return next(event, ctx ?? context);
            })(event, context));
        }
    }
    async bubbleup(event, context) {
        let res;
        if (context.get(exports.WITH_SELF)) {
            res = await (0, ioc_1.toPromise)(this.handler.handle(event, context));
        }
        if (res === false || !event.propagation)
            return false;
        if (this.parent) {
            // Publish event via parent multicaster as well...
            return await this.parent.bubbleup(event, context);
        }
    }
    handle(event, context) {
        const handlers = this.maps.get((0, ioc_1.getType)(event));
        if (!handlers || !handlers.length)
            return;
        return (0, ioc_1.composeHandlers)(handlers, (r, next, input, ctx) => {
            if (r !== false || event.propagation) {
                return next(event, ctx ?? context);
            }
            return r;
        })(event, context);
    }
    clear() {
        this.maps.clear();
        this._handler.onDestroy();
    }
}
exports.DefaultEventMulticaster = DefaultEventMulticaster;
//# sourceMappingURL=events.js.map