import { AppConfiguration, AppConfigurationToken } from './AppConfiguration';
import {
    IContainer, Token, Type, LoadType, lang, isString, isArray,
    isToken, isFunction, isClass, Injectable, IContainerBuilder, DefaultContainerBuilder
} from '@ts-ioc/core';
import { IApplicationBuilder, ApplicationBuilderToken, CustomRegister } from './IApplicationBuilder';
import { IApplication } from './IApplication';
import { BaseModuleBuilder } from './ModuleBuilder';
import { RootModuleBuilderToken, RootContainerToken } from './IModuleBuilder';


/**
 * application builder.
 *
 * @export
 * @class ApplicationBuilder
 * @extends {BaseModuleBuilder<T>}
 * @template T
 */
@Injectable(ApplicationBuilderToken)
export class ApplicationBuilder<T> extends BaseModuleBuilder<T> implements IApplicationBuilder<T> {
    protected globalConfig: Promise<AppConfiguration<T>>;
    protected globalModules: LoadType[];
    protected customRegs: CustomRegister<T>[];

    constructor(public baseURL?: string) {
        super();
        this.globalModules = [];
        this.customRegs = [];
    }

    getContainer() {
        if (!this.container) {
            let builder = this.getContainerBuilder();
            this.container = builder.create();
        }
        return this.container;
    }

    containerBuilder: IContainerBuilder;
    getContainerBuilder() {
        if (!this.containerBuilder) {
            this.containerBuilder = this.createContainerBuilder();
        }
        return this.containerBuilder;
    }

    protected createContainerBuilder(): IContainerBuilder {
        return new DefaultContainerBuilder();
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
            pcfg = builder.loader.load([config])
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
     * use module as global Depdences module.
     *
     * @param {...LoadType[]} modules
     * @returns {this}
     * @memberof PlatformServer
     */
    use(...modules: LoadType[]): this {
        this.globalModules = this.globalModules.concat(modules);
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
        let app: IApplication = await this.build(token);
        let bootMd: any;
        let container = app.container || this.getContainer();
        if (app.config && isToken(token)) {
            if (app.config.bootstrap !== token) {
                if (!container.has(token) && isClass(token)) {
                    container.register(token);
                }
                if (container.has(token)) {
                    bootMd = container.resolve(token);
                }
            }
        }
        bootMd = bootMd || app;
        if (isFunction(bootMd.onStart)) {
            await Promise.resolve(bootMd.onStart(app));
        }

        if (isFunction(bootMd.onStarted)) {
            bootMd.onStarted(app);
        }
        return app;
    }

    /**
     * build application.
     *
     * @param {IModuleBuilder<T>} builder
     * @param {(Token<T> | Type<any> | AppConfiguration<T>)} token
     * @returns {Promise<any>}
     * @memberof ApplicationBuilder
     */
    async build(token: Token<T> | Type<any> | AppConfiguration<T>, data?: any): Promise<any> {
        if (!this.rootContainer) {
            await this.registerRoot();
        }
        this.resetContainer();
        this.container.bindProvider(RootContainerToken, this.rootContainer);
        if (this.rootContainer.has(RootModuleBuilderToken)) {
            let builder = this.rootContainer.get(RootModuleBuilderToken);
            return await builder.build(token, data);
        } else {
            return await super.build(token, data);
        }
    }

    async registerRoot(): Promise<IContainer> {
        if (!this.rootContainer) {
            this.rootContainer = this.getContainerBuilder().create();
            let cfg = await this.getGlobalConfigure();
            this.bindAppConfig(cfg);
            await this.registerDepdences(this.rootContainer, cfg);
            this.rootContainer.bindProvider(AppConfigurationToken, cfg);
        }
        return this.rootContainer;
    }

    protected getGlobalConfigure() {
        if (!this.globalConfig) {
            this.useConfiguration();
        }
        return this.globalConfig;
    }

    protected canRegRootDepds() {
        return false;
    }

    /**
     * create default container builder.
     *
     * @protected
     * @returns
     * @memberof ApplicationBuilder
     */
    protected createBuilder(baseURL?: string): IApplicationBuilder<T> {
        return new ApplicationBuilder(baseURL);
    }


    /**
     * register ioc exts
     *
     * @protected
     * @param {IContainer} container
     * @param {AppConfiguration<T>} config
     * @returns {Promise<IContainer>}
     * @memberof ApplicationBuilder
     */
    protected async registerExts(container: IContainer, config: AppConfiguration<T>): Promise<IContainer> {
        await super.registerExts(container, config);
        config.exports = config.exports || [];
        if (this.customRegs.length) {
            await Promise.all(this.customRegs.map(async cs => {
                let tokens = await cs(container, config, this);
                if (isArray(tokens) && tokens.length) {
                    config.exports = config.exports.concat(tokens);
                }
            }));
        }
        if (this.globalModules.length) {
            let usedModules = this.globalModules;
            let tokens = await container.loadModule(...usedModules);
            if (tokens.length) {
                config.exports = config.exports.concat(tokens);
            }
        }
        return container;
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
        cfg = await super.mergeConfigure(cfg);
        let gcfg = this.rootContainer.get(AppConfigurationToken);
        return lang.assign({}, lang.omit(gcfg || {}, 'imports', 'providers', 'bootstrap', 'builder', 'exports'), cfg);
    }

    protected bindAppConfig(config: AppConfiguration<T>): AppConfiguration<T> {
        if (this.baseURL) {
            config.baseURL = this.baseURL;
        }
        return config;
    }

    protected getDefaultConfig(): AppConfiguration<T> {
        return { debug: false } as AppConfiguration<T>;
    }

}
