import { ModuleBuilder } from './ModuleBuilder';
import { AppConfiguration, AppConfigurationToken } from './AppConfiguration';
import { IModuleBuilder, ModuleBuilderToken } from './IModuleBuilder';
import { Token, Type, LoadType } from './types';
import { lang, isString, isClass, isMetadataObject, isFunction } from './utils/index';
import { IContainer } from './IContainer';
import { IContainerBuilder } from './IContainerBuilder';
import { ModuleConfiguration } from './ModuleConfiguration';
import { DefaultContainerBuilder } from './DefaultContainerBuilder';
import { CustomRegister, IApplicationBuilder } from './IApplicationBuilder';

/**
 * application builder.
 *
 * @export
 * @class ApplicationBuilder
 * @extends {ModuleBuilder<T>}
 * @template T
 */
export class ApplicationBuilder<T> implements IApplicationBuilder<T> {
    private _moduleBuilder: IModuleBuilder<T>;
    protected container: Promise<IContainer>;
    protected builder: IContainerBuilder;
    protected configuration: Promise<AppConfiguration<T>>;
    protected usedModules: (LoadType)[];
    protected customs: CustomRegister<T>[];
    constructor(public baseURL?: string) {
        this.usedModules = [];
        this.customs = [];
    }

    useContainer(container: IContainer | Promise<IContainer>) {
        if (container) {
            this.container = Promise.resolve(container);
        }
        return this;
    }

    /**
     * use container builder
     *
     * @param {IContainerBuilder} builder
     * @returns
     * @memberof ModuleBuilder
     */
    useContainerBuilder(builder: IContainerBuilder) {
        this.builder = builder;
        return this;
    }

    /**
     * use custom configuration.
     *
     * @param {(string | AppConfiguration<T>)} [config]
     * @returns {this}
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | AppConfiguration<T>): this {
        if (!this.configuration) {
            this.configuration = Promise.resolve(this.getDefaultConfig());
        }
        let pcfg: Promise<AppConfiguration<T>>;
        let builder = this.getContainerBuilder();
        if (isString(config)) {
            pcfg = builder.loader.load(config)
                .then(rs => {
                    return rs.length ? rs[0] as T : null;
                })
        } else if (config) {
            pcfg = Promise.resolve(config);
        }

        if (pcfg) {
            this.configuration = this.configuration
                .then(cfg => {
                    return pcfg.then(rcfg => {
                        let excfg = (rcfg['default'] ? rcfg['default'] : rcfg) as T;
                        cfg = lang.assign(cfg || {}, excfg || {}) as T;
                        return cfg;
                    });
                });
        }

        return this;
    }

    /**
     * use module, custom module.
     *
     * @param {(...(LoadType | CustomRegister<T>)[])} modules
     * @returns {this}
     * @memberof PlatformServer
     */
    useModules(...modules: (LoadType | CustomRegister<T>)[]): this {
        modules.forEach(m => {
            if (isFunction(m) && !isClass(m)) {
                this.customs.push(m);
            } else {
                this.usedModules.push(m);
            }
        });
        return this;
    }

    /**
     * bootstrap application via main module
     *
     * @param {(Token<T> | Type<any>)} bootModule
     * @returns {Promise<T>}
     * @memberof ApplicationBuilder
     */
    async bootstrap(bootModule: Token<T> | Type<any>): Promise<T> {
        let container = await this.getContainer();
        let builder = this.getModuleBuilder(container);
        let cfg = await this.getConfiguration(this.getModuleConfigure(builder, bootModule));
        await this.initContainer(cfg, container);
        cfg.bootstrap = cfg.bootstrap || bootModule;
        let app = await builder.build(cfg);
        return app;
    }


    /**
     * get module builer.
     *
     * @returns {IModuleBuilder<T>}
     * @memberof IApplicationBuilder
     */
    getModuleBuilder(container: IContainer): IModuleBuilder<T> {
        if (!this._moduleBuilder) {
            this._moduleBuilder = container.get(ModuleBuilderToken);
        }
        return this._moduleBuilder;
    }

    protected getModuleConfigure(builer: IModuleBuilder<T>, boot: Token<T> | Type<any>) {
        return builer.getConfigure(boot);
    }


    protected setConfigRoot(config: AppConfiguration<T>) {
        if (this.baseURL) {
            config.baseURL = this.baseURL;
        }
    }

    protected async initContainer(config: AppConfiguration<T>, container: IContainer): Promise<IContainer> {
        this.setConfigRoot(config);
        if (this.usedModules.length) {
            let usedModules = this.usedModules;
            this.usedModules = [];
            await container.loadModule(container, ...usedModules);
        }
        container.bindProvider(AppConfigurationToken, config);

        if (this.customs.length) {
            let customs = this.customs;
            this.customs = [];
            await Promise.all(customs.map(cs => {
                return cs(container, config, this);
            }));
        }
        return container;
    }

    /**
     * get container builder.
     *
     * @returns
     * @memberof ModuleBuilder
     */
    protected getContainerBuilder() {
        if (!this.builder) {
            this.builder = new DefaultContainerBuilder();
        }
        return this.builder;
    }

    protected getContainer(...modules: LoadType[]) {
        if (!this.container) {
            this.container = this.getContainerBuilder().build(...modules);
        }
        return this.container;
    }

    /**
     * get configuration.
     *
     * @returns {Promise<T>}
     * @memberof Bootstrap
     */
    protected async getConfiguration(cfg?: AppConfiguration<T>): Promise<AppConfiguration<T>> {
        if (!this.configuration) {
            this.useConfiguration(cfg);
        } else if (lang.hasField(cfg)) {
            this.useConfiguration(cfg);
        }
        return await this.configuration;
    }

    protected getDefaultConfig(): AppConfiguration<T> {
        return { debug: false } as AppConfiguration<T>;
    }


}
