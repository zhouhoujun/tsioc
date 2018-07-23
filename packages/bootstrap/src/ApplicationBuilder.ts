import { AppConfiguration } from './AppConfiguration';
import { IModuleBuilder, ModuleBuilderToken } from './IModuleBuilder';
import {
    IContainer, Token, Type, LoadType, lang, isString,
    isToken, IContainerBuilder, ContainerBuilderToken, DefaultContainerBuilder
} from '@ts-ioc/core';
import { CustomRegister, IApplicationBuilder } from './IApplicationBuilder';
import { IApplication } from './IApplication';
import { BootstrapModule } from './BootstrapModule';

/**
 * application builder.
 *
 * @export
 * @class ApplicationBuilder
 * @extends {ModuleBuilder<T>}
 * @template T
 */
export class ApplicationBuilder<T extends IApplication> implements IApplicationBuilder<T> {
    private moduleBuilder: IModuleBuilder<T>;
    private container: IContainer;
    private builder: IContainerBuilder;
    protected globalConfig: Promise<AppConfiguration<T>>;
    protected usedModules: LoadType[];
    protected customRegs: CustomRegister<T>[];
    constructor(public baseURL?: string) {
        this.usedModules = [];
        this.customRegs = [];
    }


    /**
     * get container
     *
     * @returns
     * @memberof ApplicationBuilder
     */
    getContainer(): IContainer {
        if (!this.container) {
            this.container = this.getContainerBuilder().create();
        }
        return this.container;
    }

    /**
     * set container.
     *
     * @param {IContainer} container
     * @returns
     * @memberof ApplicationBuilder
     */
    setContainer(container: IContainer) {
        if (container) {
            this.container = container;
            this.builder = container.get(ContainerBuilderToken);
        }
        return this;
    }

    /**
     * get container builder.
     *
     * @returns
     * @memberof ModuleBuilder
     */
    getContainerBuilder(): IContainerBuilder {
        if (!this.builder) {
            this.builder = this.createContainerBuilder();
        }
        return this.builder;
    }

    /**
     * use container builder
     *
     * @param {IContainerBuilder} builder
     * @returns
     * @memberof ModuleBuilder
     */
    setContainerBuilder(builder: IContainerBuilder) {
        this.builder = builder;
        this.container = null;
        return this;
    }


    /**
     * get module builer.
     *
     * @returns {IModuleBuilder<T>}
     * @memberof IApplicationBuilder
     */
    getModuleBuilder(): IModuleBuilder<T> {
        if (!this.moduleBuilder) {
            this.moduleBuilder = this.createModuleBuilder();
        }
        return this.moduleBuilder;
    }

    /**
     * set module builder.
     *
     * @param {IModuleBuilder<T>} builder
     * @returns {this}
     * @memberof ApplicationBuilder
     */
    setModuleBuilder(builder: IModuleBuilder<T>): this {
        this.moduleBuilder = builder;
        return this;
    }

    /**
     * use configuration.
     *
     * @param {(string | AppConfiguration<T>)} [config]
     * @returns {this} global config for this application.
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | AppConfiguration<T>): this {
        if (!this.globalConfig) {
            this.globalConfig = Promise.resolve(this.getDefaultConfig());
        }
        let pcfg: Promise<AppConfiguration<T>>;
        let builder = this.getContainerBuilder();
        if (isString(config)) {
            pcfg = builder.loader.load(config)
                .then(rs => {
                    return rs.length ? rs[0] as AppConfiguration<T> : null;
                })
        } else if (config) {
            pcfg = Promise.resolve(config);
        }

        if (pcfg) {
            this.globalConfig = this.globalConfig
                .then(cfg => {
                    return pcfg.then(rcfg => {
                        let excfg = (rcfg['default'] ? rcfg['default'] : rcfg) as AppConfiguration<T>;
                        cfg = lang.assign(cfg || {}, excfg || {}) as AppConfiguration<T>;
                        return cfg;
                    });
                });
        }

        return this;
    }

    /**
     * use module, custom module.
     *
     * @param {...(LoadType | CustomRegister<T>)[]} modules
     * @returns {this}
     * @memberof PlatformServer
     */
    use(...modules: LoadType[]): this {
        this.usedModules = this.usedModules.concat(modules);
        return this;
    }

    /**
     * register modules via custom.
     *
     * @param {...CustomRegister<T>[]} moduleRegs
     * @returns {this}
     * @memberof ApplicationBuilder
     */
    registerModules(...moduleRegs: CustomRegister<T>[]): this {
        this.customRegs = this.customRegs.concat(moduleRegs);
        return this;
    }

    /**
     * build and bootstrap application.
     *
     * @param {(Token<T> | Type<any> | AppConfiguration<T>)} token
     * @returns {Promise<T>}
     * @memberof ApplicationBuilder
     */
    async bootstrap(token: Token<T> | Type<any> | AppConfiguration<T>): Promise<any> {
        return await this.build(token);
    }

    /**
     * build application.
     *
     * @param {IModuleBuilder<T>} builder
     * @param {(Token<T> | Type<any> | AppConfiguration<T>)} token
     * @returns {Promise<any>}
     * @memberof ApplicationBuilder
     */
    async build(token: Token<T> | Type<any> | AppConfiguration<T>): Promise<T> {
        let container = this.getContainer();
        await this.registerExts(container);
        let builder = this.getModuleBuilder();
        let cfg: AppConfiguration<T> = await this.mergeConfigure(this.getModuleConfigure(builder, token));
        this.bindConfiguration(container, cfg);
        await this.initContainer(cfg, container);
        if (!cfg.bootstrap) {
            cfg.bootstrap = (isToken(token) ? token : null);
        }
        let app = await builder.build(cfg);
        return app;
    }

    /**
     * create default module builder.
     *
     * @protected
     * @returns
     * @memberof ApplicationBuilder
     */
    protected createModuleBuilder() {
        return this.getContainer().get(ModuleBuilderToken);
    }

    /**
     * create default container builder.
     *
     * @protected
     * @returns
     * @memberof ApplicationBuilder
     */
    protected createContainerBuilder() {
        return new DefaultContainerBuilder();
    }

    /**
     * get module configure.
     *
     * @protected
     * @param {IModuleBuilder<T>} builer
     * @param {(Token<T> | Type<any> | AppConfiguration<T>)} boot
     * @returns {AppConfiguration<T>}
     * @memberof ApplicationBuilder
     */
    protected getModuleConfigure(builer: IModuleBuilder<T>, boot: Token<T> | Type<any> | AppConfiguration<T>): AppConfiguration<T> {
        return builer.getConfigure(boot);
    }


    /**
     * register ioc exts
     *
     * @protected
     * @param {IContainer} container
     * @returns {Promise<IContainer>}
     * @memberof ApplicationBuilder
     */
    protected async registerExts(container: IContainer): Promise<IContainer> {
        if (!container.has(BootstrapModule)) {
            container.register(BootstrapModule);
        }
        if (this.usedModules.length) {
            let usedModules = this.usedModules;
            this.usedModules = [];
            await container.loadModule(container, ...usedModules);
        }
        return container;
    }

    protected async initContainer(config: AppConfiguration<T>, container: IContainer): Promise<IContainer> {
        if (this.customRegs.length) {
            let customs = this.customRegs;
            this.customRegs = [];
            await Promise.all(customs.map(cs => {
                return cs(container, config, this);
            }));
        }
        return container;
    }

    protected bindConfiguration(container: IContainer, config: AppConfiguration<T>) {
        if (this.baseURL) {
            config.baseURL = this.baseURL;
        }
    }


    /**
     * meger config configuration with global config.
     *
     * @protected
     * @param {AppConfiguration<T>} cfg
     * @returns {Promise<AppConfiguration<T>>}
     * @memberof ApplicationBuilder
     */
    protected async mergeConfigure(cfg: AppConfiguration<T>): Promise<AppConfiguration<T>> {
        if (!this.globalConfig) {
            this.useConfiguration();
        }
        let gcfg = await this.globalConfig;
        return lang.assign({}, gcfg, cfg);
    }

    protected getDefaultConfig(): AppConfiguration<T> {
        return { debug: false } as AppConfiguration<T>;
    }


}
