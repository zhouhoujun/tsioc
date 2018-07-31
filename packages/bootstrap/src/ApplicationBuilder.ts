import { AppConfiguration } from './AppConfiguration';
import {
    IContainer, LoadType, lang, isString, ContainerBuilderToken
} from '@ts-ioc/core';
import { IApplicationBuilder, CustomRegister } from './IApplicationBuilder';
import { BaseModuleBuilder } from './ModuleBuilder';


/**
 * application builder.
 *
 * @export
 * @class Default ApplicationBuilder
 * @extends {ModuleBuilder}
 * @template T
 */
export class DefaultApplicationBuilder extends BaseModuleBuilder implements IApplicationBuilder {
    protected globalConfig: Promise<AppConfiguration>;
    protected globalModules: LoadType[];
    protected customRegs: CustomRegister[];

    root: IContainer;

    constructor(public baseURL?: string) {
        super();
        this.globalModules = [];
        this.customRegs = [];
    }

    /**
     * use configuration.
     *
     * @param {(string | AppConfiguration)} [config]
     * @returns {this} global config for this application.
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | AppConfiguration, container?: IContainer): this {
        if (!this.globalConfig) {
            this.globalConfig = Promise.resolve(this.getDefaultConfig());
        }
        let pcfg: Promise<AppConfiguration>;
        if (isString(config)) {
            if (container) {
                let builder = container.resolve(ContainerBuilderToken);
                pcfg = builder.loader.load([config])
                    .then(rs => {
                        return rs.length ? rs[0] as AppConfiguration : null;
                    })
            }
        } else if (config) {
            pcfg = Promise.resolve(config);
        }

        if (pcfg) {
            this.globalConfig = this.globalConfig
                .then(cfg => {
                    return pcfg.then(rcfg => {
                        let excfg = (rcfg['default'] ? rcfg['default'] : rcfg) as AppConfiguration;
                        cfg = lang.assign(cfg || {}, excfg || {}) as AppConfiguration;
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

    async registerConfgureDepds(container: IContainer, config: AppConfiguration): Promise<AppConfiguration> {
        if (!this.globalConfig) {
            this.useConfiguration();
        }
        let globalCfg = await this.globalConfig;
        config = this.mergeGlobalConfig(globalCfg, config);
        this.bindAppConfig(config);
        config = await super.registerConfgureDepds(container, config);
        return config;
    }

    protected mergeGlobalConfig(globalCfg: AppConfiguration, moduleCfg: AppConfiguration) {
        return lang.assign({}, globalCfg, moduleCfg);
    }

    /**
     * register ioc exts
     *
     * @protected
     * @param {IContainer} container
     * @param {AppConfiguration} config
     * @returns {Promise<IContainer>}
     * @memberof ApplicationBuilder
     */
    protected async registerExts(container: IContainer, config: AppConfiguration): Promise<IContainer> {
        await super.registerExts(container, config);
        config.exports = config.exports || [];

        if (this.globalModules.length) {
            let usedModules = this.globalModules;
            await container.loadModule(...usedModules);
        }

        if (this.customRegs.length) {
            await Promise.all(this.customRegs.map(async cs => {
                let tokens = await cs(container, config, this);
                return tokens;
            }));
        }
        return container;
    }

    protected bindAppConfig(config: AppConfiguration): AppConfiguration {
        if (this.baseURL) {
            config.baseURL = this.baseURL;
        }
        return config;
    }

    protected getDefaultConfig(): AppConfiguration {
        return { debug: false } as AppConfiguration;
    }

}
