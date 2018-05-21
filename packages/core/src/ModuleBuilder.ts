import { Type, ModuleType, LoadType } from './types';
import { ModuleConfiguration, CustomDefineModule, ModuleConfigurationToken, IModuleBuilder } from './IModuleBuilder';
import { IContainer } from './IContainer';
import { hasClassMetadata, Autorun } from './core/index';
import { Defer, isString, lang, isFunction, isClass, isUndefined } from './utils/index';
import { IContainerBuilder } from './IContainerBuilder';
import { DefaultContainerBuilder } from './DefaultContainerBuilder';

/**
 * server app bootstrap
 *
 * @export
 * @class Bootstrap
 */
export class ModuleBuilder implements IModuleBuilder {

    protected container: Defer<IContainer>;
    protected configDefer: Defer<ModuleConfiguration>;
    protected builder: IContainerBuilder;
    protected usedModules: (LoadType)[];
    protected customs: CustomDefineModule[];
    constructor() {
        this.usedModules = [];
        this.customs = [];
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
     * @param {(string | ModuleConfiguration)} [config]
     * @returns {this}
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | ModuleConfiguration): this {
        if (!this.configDefer) {
            this.configDefer = Defer.create<ModuleConfiguration>();
            this.configDefer.resolve(<ModuleConfiguration>{ debug: false });
        }
        let cfgmodeles: Promise<ModuleConfiguration>;
        let builder = this.getContainerBuilder();
        if (isString(config)) {
            cfgmodeles = builder.loader.load(config)
                .then(rs => {
                    return rs.length ? rs[0] as ModuleConfiguration : null;
                })
        } else if (config) {
            cfgmodeles = Promise.resolve(config);
        }

        if (cfgmodeles) {
            this.configDefer.promise = this.configDefer.promise
                .then(cfg => {
                    return cfgmodeles.then(rcfg => {
                        let excfg = (rcfg['default'] ? rcfg['default'] : rcfg) as ModuleConfiguration;
                        cfg = lang.assign(cfg || {}, excfg || {}) as ModuleConfiguration;
                        return cfg;
                    });
                });
        }

        return this;
    }

    /**
     * get configuration.
     *
     * @returns {Promise<ModuleConfiguration>}
     * @memberof Bootstrap
     */
    getConfiguration(): Promise<ModuleConfiguration> {
        if (!this.configDefer) {
            this.useConfiguration();
        }
        return this.configDefer.promise;
    }

    protected createContainer(modules?: LoadType | LoadType[], basePath?: string): Promise<IContainer> {
        return this.getContainerBuilder().build(modules, basePath);
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
            this.builder = new DefaultContainerBuilder();
        }
        return this.builder;
    }

    /**
     * use module, custom module.
     *
     * @param {(...(LoadType | CustomDefineModule)[])} modules
     * @returns {this}
     * @memberof PlatformServer
     */
    use(...modules: (LoadType | CustomDefineModule)[]): this {
        modules.forEach(m => {
            if (isFunction(m) && !isClass(m)) {
                this.customs.push(m);
            } else {
                this.usedModules.push(m);
            }
        });
        return this;
    }

    async build() {
        let cfg: ModuleConfiguration = await this.getConfiguration();
        let container: IContainer = await this.getContainer();
        container = await this.initIContainer(cfg, container);
        return container;
    }

    async bootstrap(modules: Type<any>) {
        let container = await this.build();
        if (!container.has(modules)) {
            container.register(modules);
        }
        if (!hasClassMetadata(Autorun, modules)) {
            container.resolve(modules);
        }
    }

    protected setRootdir(config: ModuleConfiguration) {

    }

    protected async initIContainer(config: ModuleConfiguration, container: IContainer): Promise<IContainer> {
        this.setRootdir(config);
        container.registerSingleton(ModuleConfigurationToken, config);
        let builder = this.getContainerBuilder();
        if (this.usedModules.length) {
            await builder.loadModule(container, ...this.usedModules);
        }

        if (this.customs.length) {
            await Promise.all(this.customs.map(cs => {
                return cs(container, config, this);
            }));
        }

        return container;
    }
}
