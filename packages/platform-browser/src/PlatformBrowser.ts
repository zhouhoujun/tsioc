import { IContainer, Type, Defer, lang, isString, isFunction, isClass, IContainerBuilder, AsyncLoadOptions, ModuleType, hasClassMetadata, Autorun, isUndefined } from '@ts-ioc/core';
import { AppConfiguration, defaultAppConfig, AppConfigurationToken } from './AppConfiguration';
import { ContainerBuilder } from './ContainerBuilder';



export type CustomDefineModule = (container: IContainer, config?: AppConfiguration) => any | Promise<any>;


declare let System: any;
/**
 * server app bootstrap
 *
 * @export
 * @class Bootstrap
 */
export class PlatformBrowser {

    private container: Defer<IContainer>;
    private configDefer: Defer<AppConfiguration>;
    private builder: IContainerBuilder;
    private usedModules: (ModuleType | string)[];
    private customs: CustomDefineModule[];
    constructor(public rootdir: string) {
        this.usedModules = [];
        this.customs = [];
    }

    static create(rootdir: string) {
        return new PlatformBrowser(rootdir);
    }

    useContainer(container: IContainer | Promise<IContainer>) {
        if (container) {
            if (!this.container) {
                this.container = Defer.create<IContainer>();
            }
            this.container.resolve(container);
        }
        return this;
    }

    /**
     * get container of bootstrap.
     *
     * @returns
     * @memberof Bootstrap
     */
    getContainer() {
        if (!this.container) {
            this.useContainer(this.createContainer());
        }
        return this.container.promise;
    }

    /**
     * use custom configuration.
     *
     * @param {(string | AppConfiguration)} [config]
     * @returns {this}
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | AppConfiguration): this {
        if (!this.configDefer) {
            this.configDefer = Defer.create<AppConfiguration>();
            this.configDefer.resolve(lang.assign({}, defaultAppConfig));
        }
        let cfgmodeles: Promise<AppConfiguration>;
        let builder = this.getContainerBuilder();
        if (isString(config)) {
            cfgmodeles = builder.loader.load({ files: [config] })
                .then(rs => {
                    return rs.length ? rs[0] : null;
                })
        } else if (config) {
            cfgmodeles = Promise.resolve(config);
        }

        if (cfgmodeles) {

            this.configDefer.promise = this.configDefer.promise
                .then(cfg => {
                    return cfgmodeles.then(rcfg => {
                        let excfg = (rcfg['default'] ? rcfg['default'] : rcfg) as AppConfiguration;
                        cfg = lang.assign(cfg || {}, excfg || {});
                        return cfg;
                    });
                });
        }

        return this;
    }

    /**
     * get configuration.
     *
     * @returns {Promise<AppConfiguration>}
     * @memberof Bootstrap
     */
    getConfiguration(): Promise<AppConfiguration> {
        if (!this.configDefer) {
            this.useConfiguration();
        }
        return this.configDefer.promise;
    }

    protected createContainer(option?: AsyncLoadOptions): Promise<IContainer> {
        return this.getContainerBuilder().build(option);
    }


    /**
     * use container builder
     *
     * @param {IContainerBuilder} builder
     * @returns
     * @memberof Bootstrap
     */
    useContainerBuilder(builder: IContainerBuilder) {
        this.builder = builder;
        return this;
    }

    /**
     * get container builder.
     *
     * @returns
     * @memberof Bootstrap
     */
    getContainerBuilder() {
        if (!this.builder) {
            this.builder = new ContainerBuilder();
        }
        return this.builder;
    }

    /**
     * use module, custom module.
     *
     * @param {(...(ModuleType | string | CustomDefineModule)[])} modules
     * @returns {this}
     * @memberof PlatformServer
     */
    use(...modules: (ModuleType | string | CustomDefineModule)[]): this {
        modules.forEach(m=>{
            if(isFunction(m) && !isClass(m)){
                this.customs.push(m);
            } else {
                this.usedModules.push(m);
            }
        });
        return this;
    }

    async bootstrap(modules: Type<any>) {
        let cfg: AppConfiguration = await this.getConfiguration();
        let container: IContainer = await this.getContainer();
        container = await this.initIContainer(cfg, container);
        if (!container.has(modules)) {
            container.register(modules);
        }
        if (!hasClassMetadata(Autorun, modules)) {
            container.resolve(modules);
        }
    }

    protected async initIContainer(config: AppConfiguration, container: IContainer): Promise<IContainer> {
        config.rootdir = !isUndefined(System) ? System.baseURL : location.href;
        container.registerSingleton(AppConfigurationToken, config);
        let builder = this.getContainerBuilder();
        if (this.usedModules.length) {
            await builder.loadModule(container, {
                modules: this.usedModules
            });
        }

        if (this.customs.length) {
            await Promise.all(this.customs.map(cs => {
                return cs(container, config);
            }));
        }

        container.resolve(AppConfigurationToken);
        return container;
    }
}
