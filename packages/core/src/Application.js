"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Application = void 0;
exports.bootstrapApplication = bootstrapApplication;
const ioc_1 = require("@tsdi/ioc");
const ApplicationContext_1 = require("./ApplicationContext");
const providers_1 = require("./providers");
const ModuleLoader_1 = require("./ModuleLoader");
const loader_1 = require("./impl/loader");
const transform_1 = require("./pipes/transform");
const ApplicationArguments_1 = require("./ApplicationArguments");
/**
 * application.
 *
 * 应用程序启动入口
 *
 * @export
 * @class Application
 */
class Application {
    constructor(target, loader) {
        this.target = target;
        if (loader) {
            this.loader = loader;
        }
        if (!(0, ioc_1.isFunction)(target)) {
            if (!this.loader && target.loader)
                this.loader = target.loader;
            const providers = target.platformProviders?.length ? [this.getPlatformDefaultProviders(), target.platformProviders] : this.getPlatformDefaultProviders();
            target.deps = [this.getDeps(), target.deps ?? []];
            target.scope = 'root';
            this.root = this.createInjector(providers, target);
        }
        else {
            const option = { module: target, deps: this.getDeps(), scope: 'root' };
            this.root = this.createInjector(this.getPlatformDefaultProviders(), option);
        }
    }
    getPlatformDefaultProviders() {
        return providers_1.DEFAULTA_PROVIDERS;
    }
    getRootDependencies() {
        return [];
    }
    getRootDependenceProviders() {
        return providers_1.ROOT_DEPENDENCE_PROVIDERS;
    }
    getRootDefaultProviders() {
        return [];
    }
    /**
     * get application context.
     *
     * 获取当前启动应用程序的上下文.
     *
     * @returns instance of {@link ApplicationContext}.
     */
    getContext() {
        return this.context;
    }
    static run(target, option) {
        return new Application(option ? { module: target, ...option } : target).run();
    }
    /**
     * run application of module.
     *
     * 启动应用程序
     *
     * @param {...string[]} args
     * @returns {Promise<ApplicationContext<T, TArg>>}
     */
    async run() {
        try {
            const ctx = await this.createContext();
            await this.prepareContext(ctx);
            await this.refreshContext(ctx);
            await this.callRunners(ctx);
            return ctx;
        }
        catch (err) {
            await this.handleRunFailure(this.context, err);
            throw err;
        }
    }
    /**
     * close application.
     *
     * 关闭应用程序
     *
     * @returns
     */
    close() {
        return this.context.destroy();
    }
    getDeps() {
        return [transform_1.TransformModule];
    }
    createInjector(providers, option) {
        const container = option.injector ?? (0, ioc_1.createInjector)(providers);
        if (this.loader) {
            ioc_1.InjectUtil.setValue(container, ModuleLoader_1.ModuleLoader, this.loader);
        }
        else {
            this.loader = new loader_1.DefaultModuleLoader();
        }
        if (option.baseURL) {
            const appArgs = container.get(ApplicationArguments_1.ApplicationArguments, null);
            if (appArgs) {
                appArgs.mergeEnvironment({ baseURL: option.baseURL });
            }
        }
        option.platformDeps && ioc_1.InjectUtil.use(container, option.platformDeps);
        option.deps = [this.getRootDependencies(), option.deps ?? []];
        option.providers = [this.getRootDependenceProviders(), this.getRootDefaultProviders(), option.providers ?? []];
        return this.createModuleRef(container, option);
    }
    createModuleRef(container, option) {
        return (0, ioc_1.createModuleRef)(this.moduleify(option.module), container, option);
    }
    moduleify(module) {
        if ((0, ioc_1.isFunction)(module)) {
            module = (0, ioc_1.getClassRef)(module);
        }
        if (module instanceof ioc_1.ClassRef) {
            if (!module.getAnnotation().module) {
                const bootstrapType = module.type;
                return new ioc_1.ClassRef(DynamicModule, {
                    name: 'DynamicModule',
                    type: DynamicModule,
                    module: true,
                    declarations: [bootstrapType],
                    bootstrap: [bootstrapType],
                });
            }
            return module;
        }
        return new ioc_1.ClassRef(DynamicModule, {
            name: 'DynamicModule',
            type: DynamicModule,
            ...module,
            module: true,
            imports: module.imports ? (0, ioc_1.getModuleType)(module.imports) : [],
            exports: module.exports ? ioc_1.lang.getTypes(module.exports) : [],
            bootstrap: module.bootstrap ? ioc_1.lang.getTypes(module.bootstrap) : null
        });
    }
    initRoot() {
        ioc_1.InjectUtil.setValue(this.root, Application, this);
        if (!this.loader) {
            this.loader = this.root.get(ModuleLoader_1.ModuleLoader);
        }
    }
    async createContext() {
        if (!this.context) {
            const target = this.target;
            const root = this.root;
            await root.ready;
            this.initRoot();
            if ((0, ioc_1.isFunction)(target)) {
                this.context = root.get(ApplicationContext_1.ApplicationContextFactory).create(root);
            }
            else {
                if (target.loadTypes?.length) {
                    await this.loader.register(this.root, target.loadTypes);
                }
                if (target.loadDeps?.length) {
                    await ioc_1.InjectUtil.useAsync(this.root, target.loadDeps);
                }
                this.context = root.get(ApplicationContext_1.ApplicationContextFactory).create(root, { ...target, providers: [] });
            }
        }
        return this.context;
    }
    prepareContext(ctx) {
        const bootstraps = this.root.moduleReflect.getAnnotation().bootstrap;
        if (bootstraps && bootstraps.length) {
            bootstraps.forEach((type, order) => {
                ctx.runners.attach(type, { order });
            });
        }
    }
    refreshContext(ctx) {
        return ctx.refresh();
    }
    callRunners(ctx) {
        return ctx.runners.run();
    }
    async handleRunFailure(ctx, error) {
        if (ctx && !ctx.destroyed) {
            const logger = ctx.getLogger();
            logger ? logger.error(error) : console.error(error);
            await ctx.destroy();
        }
        else {
            console.error(error);
        }
    }
}
exports.Application = Application;
function bootstrapApplication(target, option) {
    return new Application(option ? { module: target, ...option } : target).run();
}
class DynamicModule {
}
//# sourceMappingURL=Application.js.map