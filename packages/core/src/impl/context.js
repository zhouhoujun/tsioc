"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultApplicationContextFactory = exports.DefaultApplicationContext = void 0;
const ioc_1 = require("@tsdi/ioc");
const logger_1 = require("@tsdi/logger");
const ApplicationArguments_1 = require("../ApplicationArguments");
const ApplicationEventMulticaster_1 = require("../ApplicationEventMulticaster");
const ApplicationRunners_1 = require("../ApplicationRunners");
const ApplicationContext_1 = require("../ApplicationContext");
const events_1 = require("../events");
class DefaultApplicationContext extends ioc_1.ContextInjector {
    constructor(parent, options = {}) {
        super(parent, options);
        this._applicationArgs = null;
        this.exit = true;
        this.isStatic = false;
        this._multicaster = parent.get(ApplicationEventMulticaster_1.ApplicationEventMulticaster);
        ioc_1.InjectUtil.setValue(this.getParent(), ApplicationContext_1.ApplicationContext, this);
        this._runners = parent.get(ApplicationRunners_1.ApplicationRunners);
        this.onDestroy(this._runners);
        if (options.eventsOptions) {
            this.eventMulticaster.use(options.eventsOptions);
        }
        if (options.runnersOptions) {
            this.runners.use(options.runnersOptions);
        }
    }
    getArguments() {
        if (!this._applicationArgs) {
            this._applicationArgs = this.get(ApplicationArguments_1.ApplicationArguments);
        }
        return this._applicationArgs;
    }
    get baseURL() {
        return this.getArguments().baseURL;
    }
    get instance() {
        return this.getParent().instance;
    }
    get runners() {
        return this._runners;
    }
    get eventMulticaster() {
        return this._multicaster;
    }
    async bootstrap(type, option) {
        const typeRef = this.runners.attach(type, { ...option });
        if (typeRef) {
            await this.runners.run(typeRef.type);
        }
        return typeRef;
    }
    getLogger(name, adapter) {
        return this.get(logger_1.LoggerManagers, null)?.getLogger(name, adapter) ?? null;
    }
    async publishEvent(obj) {
        await this.eventMulticaster.publishEvent(obj);
    }
    async refresh() {
        this._multicaster.emit(new events_1.ApplicationContextRefreshEvent(this));
    }
    close() {
        return this.destroy();
    }
    async destroy() {
        await this.runners.stop();
        super.destroy();
    }
}
exports.DefaultApplicationContext = DefaultApplicationContext;
class DefaultApplicationContextFactory extends ApplicationContext_1.ApplicationContextFactory {
    create(root, option) {
        const ann = root.moduleReflect.getAnnotation();
        const appArgs = root.get(ApplicationArguments_1.ApplicationArguments, null);
        if (ann?.baseURL && appArgs) {
            appArgs.mergeEnvironment({ baseURL: ann.baseURL });
        }
        if (!option) {
            option = {};
        }
        if (!option.args) {
            option.args = appArgs;
        }
        if (option.baseURL && appArgs && !appArgs.baseURL) {
            appArgs.mergeEnvironment({ baseURL: option.baseURL });
        }
        const ctx = this.createInstance(root, option);
        return ctx;
    }
    createInstance(inj, option) {
        return new DefaultApplicationContext(inj, option);
    }
}
exports.DefaultApplicationContextFactory = DefaultApplicationContextFactory;
_a = ioc_1.noPointcut;
DefaultApplicationContextFactory[_a] = true;
//# sourceMappingURL=context.js.map