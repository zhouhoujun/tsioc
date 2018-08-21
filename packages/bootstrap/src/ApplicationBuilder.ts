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
    private globalConfig: AppConfigure;
    protected customRegs: CustomRegister<T>[];
    protected providers: MapSet<Token<any>, any>;
    protected configs: (string | AppConfigure)[];
    root: IContainer;

    constructor(public baseURL?: string) {
        super();
        this.customRegs = [];
        this.configs = [];
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
    useConfiguration(config?: string | AppConfigure): this {
        if (isUndefined(config)) {
            config = '';
        }
        // clean cached config.
        this.globalConfig = null;
        let idx = this.configs.indexOf(config);
        if (idx >= 0) {
            this.configs.splice(idx, 1);
        }
        this.configs.push(config);

        return this;
    }

    protected loadConfig(container: IContainer, src: string): Promise<AppConfigure> {
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


    protected async getGlobalConfig(container: IContainer): Promise<AppConfigure> {
        if (!this.globalConfig) {
            let globCfg = await this.getDefaultConfig(container);
            globCfg = globCfg || {};
            if (this.configs.length < 1) {
                this.configs.push(''); // load default loader config.
            }
            let exts = await Promise.all(this.configs.map(cfg => {
                if (isString(cfg)) {
                    return this.loadConfig(container, cfg);
                } else {
                    return cfg;
                }
            }));
            exts.forEach(exCfg => {
                if (exCfg) {
                    lang.assign(globCfg, exCfg);
                }
            });
            this.globalConfig = globCfg;
        }
        return this.globalConfig;
    }

    async registerConfgureDepds(container: IContainer, config: AppConfigure): Promise<AppConfigure> {
        let globCfg = await this.getGlobalConfig(container);
        this.bindAppConfig(globCfg);
        container.bindProvider(AppConfigureToken, globCfg);
        config = await super.registerConfgureDepds(container, config);
        return config;
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
