"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultRuntime = void 0;
const tslib_1 = require("tslib");
const tokens_1 = require("../tokens");
const chk_1 = require("../utils/chk");
const class_1 = require("../metadata/class");
const injector_1 = require("../injector");
const exception_1 = require("../exception");
const runtime_1 = require("../runtime");
const handler_1 = require("../lifescope/handler");
const context_1 = require("../context");
const contexts_1 = require("../handlers/contexts");
const initialize_1 = require("./initialize");
const design_1 = require("./design");
const decor_1 = require("../metadata/decor");
const resolver_1 = require("./resolver");
const resolver_2 = require("../resolver");
/**
 * default runtime implements {@link Runtime}.
 */
class DefaultRuntime extends contexts_1.DefaultContext {
    constructor(injector) {
        super();
        this.set(injector_1.EnvironmentInjector, injector);
        this.set(runtime_1.Runtime, this);
        this.set(INJECTORS, [injector]);
        this.set(resolver_2.DEFAULTA_RESOLVER, new resolver_1.DefaultResolver((0, resolver_1.getParameterResolveHanlder)(this)));
        injector.onDestroy(this);
    }
    getModules() {
        return this.get(MODULES);
    }
    getFactories() {
        return this.get(FACTORIES);
    }
    getScopes() {
        return this.get(SCOPES);
    }
    getProviders() {
        return this.get(PROVIDERS);
    }
    getInstanceHandler() {
        if (!this._initialize) {
            this._initialize = new handler_1.RuntimeHandler(initialize_1.instanceHandler, initialize_1.INITIALIZE_INTERCEPTORS);
        }
        return this._initialize;
    }
    getRegisterHandler() {
        if (!this._design) {
            this._design = new handler_1.RuntimeHandler((typeRef) => typeRef, design_1.DESIGN_INTERECPTORS);
        }
        return this._design;
    }
    register(injector, scope) {
        const injectors = this.get(INJECTORS);
        if (injectors.indexOf(injector) < 0) {
            injectors.push(injector);
            injector.onDestroy(() => injectors.splice(injectors.indexOf(injector), 1));
        }
        if (scope) {
            this.get(SCOPES).set(scope, injector);
        }
    }
    /**
     * set value
     * @param token
     * @param value
     */
    set(token, value, injector) {
        if (this.map.has(token)) {
            throw new exception_1.Exception('has value with token:' + token.toString());
        }
        this.map.set(token, value);
        if (injector)
            injector.onDestroy(() => this.delete(token));
        return this;
    }
    get(token) {
        const val = this.map.get(token);
        if (val !== undefined)
            return val;
        if (token instanceof context_1.ContextToken) {
            const defVal = token.defaultValue();
            if (!(0, chk_1.isNil)(defVal))
                this.map.set(token, defVal);
            return defVal;
        }
        return null;
    }
    removeInjector(scope) {
        this.get(SCOPES).delete(scope);
    }
    getRegisterIn(token) {
        return this.get(INJECTORS).find(r => r.has(token, tokens_1.InjectFlags.Self)); //!!Operator.getTokenProvider(r, token, InjectFlags.Self));
    }
    /**
     * get injector
     * @param type
     */
    getInjector(scope, defaultInjector) {
        if (!scope)
            return defaultInjector;
        if (scope === 'platform') {
            return this.get(injector_1.EnvironmentInjector);
        }
        return (this.get(SCOPES).get(scope) ?? defaultInjector);
    }
    /**
     * get type provider.
     * @param type
     */
    getTypeProvider(type) {
        const tyRef = (0, class_1.getClassify)(type);
        const pdrs = tyRef.providers.slice(0);
        const pdMap = this.getProviders();
        tyRef.extendTypes.forEach(t => {
            const tpd = pdMap.get(t);
            if (tpd) {
                pdrs.unshift(tpd);
            }
        });
        return pdrs;
    }
    /**
     * set type provider.
     * @param type
     * @param providers
     */
    setTypeProvider(type, ...providers) {
        const ty = (0, chk_1.isFunction)(type) ? type : type.type;
        const pdMap = this.getProviders();
        const prds = pdMap.get(ty);
        if (prds) {
            prds.push(providers);
        }
        else {
            pdMap.set(ty, providers);
        }
    }
    removeTypeProvider(type, ...providers) {
        const ty = (0, chk_1.isFunction)(type) ? type : type.type;
        if (!providers.length) {
            this.clearTypeProvider(ty);
            return;
        }
        const prds = this.getProviders().get(ty);
        if (prds) {
            providers.forEach(p => {
                prds.splice(prds.indexOf(p), 1);
            });
        }
    }
    clearTypeProvider(type) {
        this.getProviders().delete(type);
    }
    onDestroy() {
        this.getScopes().clear();
        this.getModules().clear();
        this.getFactories().clear();
        this.getProviders().clear();
        super.onDestroy();
    }
}
exports.DefaultRuntime = DefaultRuntime;
tslib_1.__decorate([
    decor_1.nonEnumerable,
    tslib_1.__metadata("design:type", handler_1.RuntimeHandler)
], DefaultRuntime.prototype, "_initialize", void 0);
tslib_1.__decorate([
    decor_1.nonEnumerable,
    tslib_1.__metadata("design:type", handler_1.RuntimeHandler)
], DefaultRuntime.prototype, "_design", void 0);
const INJECTORS = new context_1.ContextToken(() => []);
const SCOPES = new context_1.ContextToken(() => new Map());
const MODULES = new context_1.ContextToken(() => new Map());
const FACTORIES = new context_1.ContextToken(() => new Map());
const PROVIDERS = new context_1.ContextToken(() => new Map());
//# sourceMappingURL=runtime.js.map