import { AppConfiguration } from './AppConfiguration';
import {
    IContainer, LoadType, lang, isString, ContainerBuilderToken, Token
} from '@ts-ioc/core';
import { IApplicationBuilder, CustomRegister } from './IApplicationBuilder';
import { ModuleBuilder } from './ModuleBuilder';
import { ModuleType } from './ModuleType';


/**
 * application builder.
 *
 * @export
 * @class Default ApplicationBuilder
 * @extends {ModuleBuilder<T>}
 * @template T
 */
export class DefaultApplicationBuilder<T> extends ModuleBuilder<T> implements IApplicationBuilder<T> {
    protected globalConfig: Promise<AppConfiguration<T>>;
    protected globalModules: LoadType[];
    protected customRegs: CustomRegister<T>[];

    root: IContainer;

    constructor(public baseURL?: string) {
        super();
        this.globalModules = [];
        this.customRegs = [];
    }

    /**
     * use configuration.
     *
     * @param {(string | AppConfiguration<T>)} [config]
     * @returns {this} global config for this application.
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | AppConfiguration<T>, container?: IContainer): this {
        if (!this.globalConfig) {
            this.globalConfig = Promise.resolve(this.getDefaultConfig());
        }
        let pcfg: Promise<AppConfiguration<T>>;
        if (isString(config)) {
            if (container) {
                let builder = container.resolve(ContainerBuilderToken);
                pcfg = builder.loader.load([config])
                    .then(rs => {
                        return rs.length ? rs[0] as AppConfiguration<T> : null;
                    })
            }
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

    async registerConfgureDepds(container: IContainer, config: AppConfiguration<T>): Promise<AppConfiguration<T>> {
        if (!this.globalConfig) {
            this.useConfiguration();
        }
        let globalCfg = await this.globalConfig;
        config = this.mergeGlobalConfig(globalCfg, config);
        this.bindAppConfig(config);
        config = await super.registerConfgureDepds(container, config);
        return config;
    }

    protected mergeGlobalConfig(globalCfg: AppConfiguration<T>, moduleCfg: AppConfiguration<T>) {
        return lang.assign({}, globalCfg, moduleCfg);
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
