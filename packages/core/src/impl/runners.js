"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultApplicationRunners = exports.APP_RUNNERS_BACKEND = exports.APP_RUNNERS_GUARDS = exports.APP_RUNNERS_FILTERS = exports.APP_RUNNERS_INTERCEPTORS = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const ApplicationRunners_1 = require("../ApplicationRunners");
const ApplicationEventMulticaster_1 = require("../ApplicationEventMulticaster");
const events_1 = require("../events");
const handler_1 = require("../handler");
const execption_filter_1 = require("../filters/execption.filter");
const configable_impl_1 = require("../handlers/configable.impl");
const execptions_1 = require("../execptions");
const invocation_1 = require("./invocation");
const ApplicationContext_1 = require("../ApplicationContext");
const configable_1 = require("../handlers/configable");
/**
 *  Application runner interceptors multi token
 */
exports.APP_RUNNERS_INTERCEPTORS = (0, ioc_1.token)('APP_RUNNERS_INTERCEPTORS');
/**
 *  Application runner filters multi token
 */
exports.APP_RUNNERS_FILTERS = (0, ioc_1.token)('APP_RUNNERS_FILTERS');
/**
 *  Application runner guards multi token
 */
exports.APP_RUNNERS_GUARDS = (0, ioc_1.token)('APP_RUNNERS_GUARDS');
/**
 *  Application runner hanlders multi token.
 */
exports.APP_RUNNERS_BACKEND = (0, ioc_1.token)('APP_RUNNERS_BACKEND');
let DefaultApplicationRunners = class DefaultApplicationRunners extends ApplicationRunners_1.ApplicationRunners {
    constructor(context, multicaster) {
        super();
        this.context = context;
        this.multicaster = multicaster;
        this._destroyed = false;
        this._types = [];
        this._maps = new Map();
        this._refs = new Map();
        this._handler = (0, configable_impl_1.createHandler)(context, this, exports.APP_RUNNERS_BACKEND, exports.APP_RUNNERS_INTERCEPTORS, exports.APP_RUNNERS_GUARDS, exports.APP_RUNNERS_FILTERS, {
            enableTypeChain: true,
            filters: [execption_filter_1.ExceptionHandlerFilter]
        });
    }
    get size() {
        return this._refs.size;
    }
    get handler() {
        return this._handler;
    }
    use(options, order) {
        this._handler.append((0, ioc_1.isArray)(options) ? { interceptors: options }
            : (((0, configable_1.isHandlerOptions)(options) ? options : { interceptors: [(0, ioc_1.toMutilProvdierOf)(options, order)] })));
        return this;
    }
    attach(type, options = {}) {
        let invocation;
        if (type instanceof ioc_1.Invocation) {
            invocation = type;
        }
        else {
            const target = (0, ioc_1.getClassify)(type);
            let injector = this.context.getRuntime().getRegisterIn(target.type);
            if (!injector) {
                injector = this.context;
                ioc_1.InjectUtil.register(injector, target.type);
            }
            invocation = target.createInvocation(injector, options);
        }
        let ends = this._maps.get(invocation.type);
        if (!ends) {
            ends = [];
            this._maps.set(invocation.type, ends);
        }
        this.attachRef(invocation, options.order);
        invocation.onDestroy(() => this.detach(invocation.type));
        const handler = (0, invocation_1.createInvocationHandler)(invocation, options);
        ends.push(handler);
        return invocation;
    }
    attachRef(tagRef, order) {
        const refs = this._refs.get(tagRef.type);
        if (refs) {
            refs.push(tagRef);
        }
        else {
            this._refs.set(tagRef.type, [tagRef]);
            if ((0, ioc_1.isNumber)(order)) {
                this._types.splice(order, 0, tagRef.type);
            }
            else {
                this._types.push(tagRef.type);
            }
        }
    }
    detach(type) {
        if (this._destroyed)
            return;
        this._maps.delete(type);
        this.getRefs(type).forEach(ref => ref.destroy());
        this._refs.delete(type);
        const idx = this._types.indexOf(type);
        if (idx >= 0) {
            this._types.splice(idx, 1);
        }
    }
    has(type) {
        return this._maps.has(type);
    }
    getRef(type, idx = 0) {
        return this._refs.get(type)?.[idx] ?? null;
    }
    getRefs(type) {
        return this._refs.get(type) ?? [];
    }
    async run(type) {
        if (type) {
            await (0, ioc_1.toPromise)(this._handler.handle(type, (0, handler_1.createRunContext)(this.getRef(type)?.injector ?? this.context)));
        }
        else {
            await this.startup();
            await this.beforeRun();
            if (this._types?.length) {
                await Promise.all(this._types
                    .filter(ty => this.getRef(ty)?.bootstrap !== false)
                    .map((ty) => (0, ioc_1.toPromise)(this._handler.handle(ty, (0, handler_1.createRunContext)(this.getRef(ty)?.injector ?? this.context)))));
            }
            await this.afterRun();
        }
    }
    async stop(signls) {
        try {
            await this.onShuwdown(signls);
            await this.onDispose();
        }
        finally {
            this.onDestroy();
        }
    }
    onDestroy() {
        if (this._destroyed)
            return;
        this._destroyed = true;
        this._refs.forEach(refs => refs.forEach(ref => ref.destroy()));
        this._refs.clear();
        this._maps.clear();
        this.multicaster.clear();
        this._handler.onDestroy();
        this._types = null;
    }
    handle(input, context) {
        let handlers;
        if ((0, ioc_1.isFunction)(input)) {
            handlers = this._maps.get(input);
        }
        else {
            throw new ioc_1.ArgumentException('input type unknow');
        }
        if (handlers && handlers.length) {
            return (0, ioc_1.composeHandlers)(handlers)(input, context);
        }
        throw new execptions_1.NotHandleException(context, input);
    }
    startup() {
        return this.multicaster.emit(new events_1.ApplicationStartupEvent(this));
    }
    beforeRun() {
        return this.multicaster.emit(new events_1.ApplicationStartEvent(this));
    }
    afterRun() {
        return this.multicaster.emit(new events_1.ApplicationStartedEvent(this));
    }
    onShuwdown(signls) {
        return this.multicaster.emit(new events_1.ApplicationShutdownEvent(this, signls));
    }
    onDispose() {
        return this.multicaster.emit(new events_1.ApplicationDisposeEvent(this));
    }
};
exports.DefaultApplicationRunners = DefaultApplicationRunners;
exports.DefaultApplicationRunners = DefaultApplicationRunners = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [ApplicationContext_1.ApplicationContext,
        ApplicationEventMulticaster_1.ApplicationEventMulticaster])
], DefaultApplicationRunners);
//# sourceMappingURL=runners.js.map