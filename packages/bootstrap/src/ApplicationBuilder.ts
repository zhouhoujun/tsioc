import { AppConfiguration } from './AppConfiguration';
import {
    IContainer, Token, Type, LoadType, lang, isString,
    isToken, DefaultContainerBuilder, isFunction, isClass, IContainerBuilder, ContainerBuilderFactoryToken
} from '@ts-ioc/core';
import { IApplicationBuilder, ApplicationBuilderToken, ApplicationBuilderFactoryToken } from './IApplicationBuilder';
import { BootstrapModule } from './BootstrapModule';
import { IApplication } from './IApplication';
import { ModuleBuilder } from './ModuleBuilder';

/**
 * application builder.
 *
 * @export
 * @class ApplicationBuilder
 * @extends {ModuleBuilder<T>}
 * @template T
 */
export class ApplicationBuilder<T> extends ModuleBuilder<T> implements IApplicationBuilder<T> {
    protected globalConfig: Promise<AppConfiguration<T>>;
    protected globalModules: LoadType[];
    constructor(public baseURL?: string) {
        super();
        this.globalModules = [];
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
        if (app.config && isToken(token)) {
            if (app.config.bootstrap !== token) {
                if (!this.container.has(token) && isClass(token)) {
                    this.container.register(token);
                }
                if (this.container.has(token)) {
                    bootMd = this.container.resolve(token);
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
        return bootMd;
    }

    /**
     * build application.
     *
     * @param {IModuleBuilder<T>} builder
     * @param {(Token<T> | Type<any> | AppConfiguration<T>)} token
     * @returns {Promise<any>}
     * @memberof ApplicationBuilder
     */
    build(token: Token<T> | Type<any> | AppConfiguration<T>, data?: any): Promise<any> {
        return super.build(token, data);
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
     * @returns {Promise<IContainer>}
     * @memberof ApplicationBuilder
     */
    protected async registerExts(): Promise<IContainer> {
        this.container.bindProvider(ApplicationBuilderToken, this);
        this.container.bindProvider(ApplicationBuilderFactoryToken, (baseURL?: string) => this.createBuilder());
        if (!this.container.has(BootstrapModule)) {
            this.container.register(BootstrapModule);
        }
        if (this.globalModules.length) {
            let usedModules = this.globalModules;
            this.globalModules = [];
            await this.container.loadModule(...usedModules);
        }
        return this.container;
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
        return this.bindConfiguration(lang.assign({}, gcfg, cfg));
    }

    protected bindConfiguration(config: AppConfiguration<T>): AppConfiguration<T> {
        if (this.baseURL) {
            config.baseURL = this.baseURL;
        }
        if (this.globalModules && this.globalModules.length) {
            config.imports = this.globalModules.concat(config.imports);
        }
        return config;
    }

    protected getDefaultConfig(): AppConfiguration<T> {
        return { debug: false } as AppConfiguration<T>;
    }

}
