"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigableHandler = void 0;
exports.createHandler = createHandler;
exports.normalizeConfigableHandlerOptions = normalizeConfigableHandlerOptions;
const ioc_1 = require("@tsdi/ioc");
const guard_1 = require("../guard");
const interceptor_1 = require("../interceptor");
const filter_1 = require("../filters/filter");
const handler_1 = require("../handler");
/**
 * Configable handlers
 */
class ConfigableHandler {
    get ready() {
        return this.injector.ready;
    }
    get filterResolver() {
        if (!this._filterResolver) {
            this._filterResolver = this.injector.get(filter_1.FilterResolver);
        }
        return this._filterResolver;
    }
    get interceptorResolver() {
        if (!this._interceptorResolver) {
            this._interceptorResolver = this.injector.get(interceptor_1.InterceptorResolver);
        }
        return this._interceptorResolver;
    }
    constructor(injector, options) {
        this.injector = injector;
        this.options = options;
        this._destroyed = false;
        this.chains = new Map();
        this.initOptions(options);
        this.append(this.options);
    }
    onReady() {
        return this.injector.ready;
    }
    initOptions(options) {
        if (!options.backendToken) {
            options.backendToken = handler_1.BACKENDS_TOKEN;
        }
        if (!options.interceptorsToken) {
            options.interceptorsToken = interceptor_1.INTERCEPTORS_TOKEN;
        }
        if (!options.guardsToken) {
            options.guardsToken = guard_1.GUARDS_TOKEN;
        }
        if (!options.filtersToken) {
            options.filtersToken = filter_1.FILTERS_TOKEN;
        }
    }
    handle(input, context) {
        return (0, ioc_1.invokeTail)(() => this.canHandle(input, context), (r) => {
            if (r === true) {
                return this.run(input, context);
            }
            throw this.forbiddenError();
        });
    }
    append(options) {
        if (!options || !(0, ioc_1.hasProps)(options))
            return this;
        if (options.backend) {
            this.regMulti(this.options.backendToken, options.backend, 0);
            this.resetBackend();
        }
        if (options.pipes) {
            ioc_1.InjectUtil.inject(this.injector, options.pipes);
        }
        if (options.guards) {
            this.regMulti(this.options.guardsToken, options.guards);
            this.resetGuards();
        }
        if (options.filters) {
            this.regMulti(this.options.filtersToken, options.filters);
            this.resetChain();
        }
        if (options.interceptors) {
            this.regMulti(this.options.interceptorsToken, options.interceptors);
            this.resetChain();
        }
        return this;
    }
    onDestroy() {
        if (this._destroyed)
            return;
        this._destroyed = true;
        this.clear();
    }
    async canHandle(input, context) {
        if (this.onReady)
            await this.onReady();
        if (this._guards === undefined) {
            this._guards = this.getGuards() ?? null;
        }
        if (!this._guards || !this._guards.length)
            return true;
        if (!(await (0, ioc_1.some)(this._guards.map(gd => () => (0, ioc_1.toPromise)((0, ioc_1.isFunction)(gd) ? gd(input, context) : gd.canHandle(input, context))), vaild => vaild === false))) {
            return false;
        }
        return true;
    }
    run(input, context) {
        if (!this.chain) {
            this.chain = this.compose();
        }
        return this.running(this.getChain(input), input, this.getBackend(), context);
    }
    running(chain, intput, backend, context) {
        return chain(intput, backend, context);
    }
    /**
     * get input chain, register by `@Filterable` or `@Interceptable`
     * @param input
     * @returns
     */
    getChain(input) {
        return this.options.enableTypeChain ? this.getChainOf((0, ioc_1.getType)(input)) : this.chain;
    }
    /**
     * get chain of type, register by `@Filterable` or `@Interceptable`
     * @param type
     * @returns
     */
    getChainOf(type) {
        let chain = this.chains.get(type);
        if (chain === undefined) {
            chain = this.composeTypeChain(type);
            this.chains.set(type, chain);
        }
        return chain ?? this.chain;
    }
    /**
     * componse chain of type, register by `@Filterable` or `@Interceptable`
     * @param type
     * @returns
     */
    composeTypeChain(type) {
        const filters = this.filterResolver.resolve(type);
        const inteceptors = this.interceptorResolver.resolve(type);
        if (!(filters.length || inteceptors.length))
            return null;
        const fns = [];
        if (filters?.length)
            fns.push(this.composeFilterFn(filters));
        if (inteceptors?.length)
            fns.push(...inteceptors);
        return (0, ioc_1.chainFactory)((0, ioc_1.composeInterceptors)(fns), this.chain);
    }
    resetChain() {
        this.chain = null;
        this.chains?.clear();
    }
    resetGuards() {
        this._guards = undefined;
    }
    resetBackend() {
        this.backendFn = undefined;
    }
    forbiddenError() {
        return new ioc_1.Exception('Forbidden');
    }
    /**
     * compose iterceptors and filters in chain.
     * @returns
     */
    compose() {
        const type = this.getHandlerType();
        const hdlFilters = this.filterResolver.resolve(type) ?? [];
        const hdlInteceptors = this.interceptorResolver.resolve(type) ?? [];
        const filters = this.getFilters();
        const inteceptors = this.getInterceptors();
        const fns = [];
        if (hdlFilters?.length)
            fns.push(this.composeFilterFn(hdlFilters));
        if (hdlInteceptors?.length)
            fns.push(...hdlInteceptors);
        if (filters?.length)
            fns.push(this.composeFilterFn(filters));
        if (inteceptors?.length)
            fns.push(...inteceptors);
        return this.generateInterceptorFn(fns);
    }
    composeFilterFn(filters) {
        return (0, filter_1.composeFilters)(filters);
    }
    generateInterceptorFn(fns) {
        return (0, ioc_1.composeInterceptors)(fns);
    }
    getHandlerType() {
        return this.options.handlerType ?? (0, ioc_1.getType)(this);
    }
    /**
     * get registered backend of the handler.
     * @returns
     */
    getBackend() {
        if (!this.backendFn) {
            this.backendFn = this.generateBackendFn();
        }
        return this.backendFn;
    }
    generateBackendFn() {
        const handlers = this.injector.get(this.options.backendToken);
        if (!handlers?.length)
            throw new ioc_1.ArgumentException('no backend handler.');
        return (0, ioc_1.composeHandlers)(handlers);
    }
    /**
     *  get filters.
     */
    getFilters() {
        return this.options.filtersToken ? this.injector.get(this.options.filtersToken, []) : [];
    }
    /**
     * get registered iterceptors of the handler.
     * @returns
     */
    getInterceptors() {
        return this.injector.get(this.options.interceptorsToken, []);
    }
    /**
     * get registered guards of the handler.
     * @returns
     */
    getGuards() {
        return this.options.guardsToken ? this.injector.get(this.options.guardsToken, null) : null;
    }
    regMulti(token, providers, multiOrder) {
        const multi = true;
        if ((0, ioc_1.isArray)(providers)) {
            ioc_1.InjectUtil.inject(this.injector, providers.map((r, i) => (0, ioc_1.toProvider)(token, r, { multi, multiOrder })));
        }
        else {
            ioc_1.InjectUtil.provider(this.injector, (0, ioc_1.toProvider)(token, providers, { multi, multiOrder }));
        }
    }
    clear() {
        ioc_1.InjectUtil.unregister(this.injector, this.options.interceptorsToken);
        ioc_1.InjectUtil.unregister(this.injector, this.options.guardsToken);
        ioc_1.InjectUtil.unregister(this.injector, this.options.filtersToken);
        this.chain = undefined;
        this.backendFn = undefined;
        this.chains?.clear();
        this._filterResolver = undefined;
        this._interceptorResolver = undefined;
        // this.context = null!;
        // this.options = null!;
    }
}
exports.ConfigableHandler = ConfigableHandler;
function createHandler(context, arg, backendToken, interceptorsToken, guardsToken, filtersToken, appendOptions, type) {
    let options;
    let Type = type ?? ConfigableHandler;
    if (backendToken) {
        options = {
            ...appendOptions,
            backend: arg,
            backendToken,
            interceptorsToken,
            guardsToken,
            filtersToken
        };
    }
    else {
        options = arg;
        if (!type) {
            Type = options.handlerType;
        }
    }
    normalizeConfigableHandlerOptions(options);
    return new Type((0, ioc_1.createInjector)(context, options, Type), options);
}
function normalizeConfigableHandlerOptions(options) {
    if (options.execptionHandlers) {
        const handles = (0, ioc_1.isArray)(options.execptionHandlers) ? options.execptionHandlers : [options.execptionHandlers];
        if (!options.providers) {
            options.providers = handles;
        }
        else {
            options.providers.push(handles);
        }
    }
}
//# sourceMappingURL=configable.impl.js.map