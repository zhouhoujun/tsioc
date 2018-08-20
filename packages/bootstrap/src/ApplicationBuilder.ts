import { AppConfigure, AppConfigureToken, DefaultConfigureToken, AppConfigureLoaderToken } from './AppConfigure';
import {
    IContainer, LoadType, lang, isString, MapSet, Factory, Token, isUndefined
} from '@ts-ioc/core';
import { IApplicationBuilder, CustomRegister, AnyApplicationBuilder } from './IApplicationBuilder';
import { ModuleBuilder } from './ModuleBuilder';
import { ModuleBuilderToken } from './IModuleBuilder';
import { ContainerPool, ContainerPoolToken } from './ContainerPool';


/**
 * application builder.
 *
 * @export
 * @class Default ApplicationBuilder
 * @extends {ModuleBuilder}
 * @template T
 */
export class DefaultApplicationBuilder<T> extends ModuleBuilder<T> implements IApplicationBuilder<T> {
    protected globalConfig: Promise<AppConfigure>;
    protected customRegs: CustomRegister<T>[];
    protected providers: MapSet<Token<any>, any>;
    root: IContainer;

    constructor(public baseURL?: string) {
        super();
        this.customRegs = [];
        this.providers = new MapSet();
        this.pools = new ContainerPool();
    }

    static create(baseURL?: string): AnyApplicationBuilder {
        return new DefaultApplicationBuilder<any>(baseURL);
    }

    /**
     * use configuration.
     *
     * @param {(string | AppConfigure)} [config]
     * @returns {this} global config for this application.
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | AppConfigure, container?: IContainer): this {
        container = container || this.getPools().getDefault();
        if (!this.globalConfig) {
            this.globalConfig = Promise.resolve(this.getDefaultConfig(container));
        }
        let pcfg: Promise<AppConfigure>;
        if (isString(config) || isUndefined(config)) {
            pcfg = this.loadConfig(container, config);
        } else if (config) {
            pcfg = Promise.resolve(config);
        }

        if (pcfg) {
            this.globalConfig = this.globalConfig
                .then(cfg => {
                    return pcfg.then(rcfg => {
                        if (rcfg) {
                            let excfg = (rcfg['default'] ? rcfg['default'] : rcfg) as AppConfigure;
                            cfg = lang.assign(cfg || {}, excfg || {}) as AppConfigure;
                        }
                        return cfg || {};
                    });
                });
        }

        return this;
    }

    protected loadConfig(container: IContainer, src?: string): Promise<AppConfigure> {
        if (container.has(AppConfigureLoaderToken)) {
            let loader = container.resolve(AppConfigureLoaderToken, { baseURL: this.baseURL, container: container });
            return loader.load(src);
        } else if (src) {
            let builder = container.getBuilder();
            return builder.loader.load([src])
                .then(rs => {
                    return rs.length ? rs[0] as AppConfigure : null;
                })
        } else {
            return Promise.resolve(null);
        }

    }

    /**
     * use module as global Depdences module.
     *
     * @param {...LoadType[]} modules
     * @returns {this}
     * @memberof PlatformServer
     */
    use(...modules: LoadType[]): this {
        this.pools.use(...modules);
        return this;
    }

    /**
     * bind provider
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Token<T> | Factory<T>} provider
     * @returns {this}
     * @memberof IContainer
     */
    provider(provide: Token<any>, provider: Token<any> | Factory<any>): this {
        this.providers.set(provide, provider);
        return this;
    }

    async registerConfgureDepds(container: IContainer, config: AppConfigure): Promise<AppConfigure> {
        if (!this.globalConfig) {
            this.useConfiguration(undefined, container);
        }
        let globalCfg = await this.globalConfig;
        config = this.mergeGlobalConfig(globalCfg, config);
        this.bindAppConfig(config);
        config = await super.registerConfgureDepds(container, config);
        container.bindProvider(AppConfigureToken, config);
        return config;
    }

    protected mergeGlobalConfig(globalCfg: AppConfigure, moduleCfg: AppConfigure) {
        return lang.assign({}, globalCfg, moduleCfg);
    }

    protected regDefaultContainer() {
        let container = super.regDefaultContainer();
        container.bindProvider(ContainerPoolToken, () => this.getPools());
        container.resolve(ModuleBuilderToken).setPools(this.getPools());
        return container;
    }

    /**
     * register ioc exts
     *
     * @protected
     * @param {IContainer} container
     * @param {AppConfigure} config
     * @returns {Promise<IContainer>}
     * @memberof ApplicationBuilder
     */
    protected async registerExts(container: IContainer, config: AppConfigure): Promise<IContainer> {
        await super.registerExts(container, config);

        this.providers.forEach((val, key) => {
            container.bindProvider(key, val);
        })

        if (this.customRegs.length) {
            await Promise.all(this.customRegs.map(async cs => {
                let tokens = await cs(container, config, this);
                return tokens;
            }));
        }

        return container;
    }

    protected bindAppConfig(config: AppConfigure): AppConfigure {
        if (this.baseURL) {
            config.baseURL = this.baseURL;
        }
        return config;
    }

    protected async getDefaultConfig(container: IContainer): Promise<AppConfigure> {
        if (container.has(DefaultConfigureToken)) {
            return container.resolve(DefaultConfigureToken);
        } else {
            return {} as AppConfigure;
        }
    }

}
