import { Inject, isUndefined, Singleton, isString, isMetadataObject, isPlainObject, lang } from '@tsdi/ioc';
import { ContainerToken, IContainer } from '@tsdi/core';
import { IConfigureManager, IConfigureMerger } from './IConfigureManager';
import { Configure } from './Configure';
import { ConfigureMgrToken, ConfigureLoaderToken, DefaultConfigureToken, ConfigureMergerToken, ProcessRunRootToken } from '../tk';


/**
 * configure manager.
 *
 * @export
 * @class ConfigureManager
 */
@Singleton(ConfigureMgrToken)
export class ConfigureManager<T extends Configure = Configure> implements IConfigureManager<T> {

    @Inject(ContainerToken) container: IContainer;
    private config: T;
    protected configs: (string | T)[];

    /**
     * Creates an instance of ConfigureManager.
     * @param {string} [baseURL]
     * @memberof ConfigureManager
     */
    constructor(@Inject(ProcessRunRootToken) protected baseURL?: string) {
        this.configs = [];
    }
    /**
     * use configuration.
     *
     * @param {(string | AppConfigure)} [config]
     * @returns {this} this configure manager.
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | T): this {
        if (isUndefined(config)) {
            config = '';
        }
        // clean cached config.
        this.config = null;
        lang.del(this.configs, config);
        if (!this.baseURL && isPlainObject(config)) {
            this.baseURL = config.baseURL;
        }
        this.configs.push(config);

        return this;
    }

    /**
     * get config.
     *
     * @returns {Promise<T>}
     * @memberof ConfigureManager
     */
    async getConfig(): Promise<T> {
        if (!this.config) {
            this.config = await this.initConfig();
        }
        return this.config || {} as T;
    }

    /**
     * init config.
     *
     * @protected
     * @returns
     * @memberof ConfigureManager
     */
    protected async initConfig() {
        let config = await this.getDefaultConfig();
        if (this.configs.length < 1) {
            this.configs.push(''); // load default loader config.
        }
        let exts = await Promise.all(this.configs.map(cfg => {
            if (isString(cfg)) {
                return this.loadConfig(cfg);
            } else {
                return cfg;
            }
        }));
        const merger = this.container.get(ConfigureMergerToken);
        exts.forEach(exCfg => {
            if (exCfg) {
                exCfg = isMetadataObject(exCfg['default']) ? exCfg['default'] : exCfg;
                config = (merger ? merger.merge(config, exCfg) : Object.assign(config, exCfg)) as T;
            }
        });
        return config;
    }

    /**
     * load config.
     *
     * @protected
     * @param {string} src
     * @returns {Promise<T>}
     * @memberof ConfigureManager
     */
    protected async loadConfig(src: string): Promise<T> {
        if (this.container.has(ConfigureLoaderToken)) {
            let loader = this.container.resolve(ConfigureLoaderToken, { provide: 'baseURL', useValue: this.baseURL }, { provide: 'container', useValue: this.container });
            return await loader.load(src) as T;
        } else if (src) {
            let cfg = await this.container.getLoader().load([src])
            return cfg.length ? cfg[0] as Configure as T : null;
        } else {
            return null;
        }
    }

    /**
     * get default config.
     *
     * @protected
     * @returns {Promise<T>}
     * @memberof ConfigureManager
     */
    protected async getDefaultConfig(): Promise<T> {
        if (this.container.has(DefaultConfigureToken)) {
            return this.container.resolve(DefaultConfigureToken) as T;
        } else {
            return {} as T;
        }
    }
}


@Singleton(ConfigureMergerToken)
export class ConfigureMerger implements IConfigureMerger {
    merge(config1: Configure, config2: Configure): Configure {
        let setting = { ...config1?.setting, ...config2?.setting };
        let deps = [...config1?.deps || [], ...config2?.deps || []];
        let providers = [...config1?.providers || [], ...config2?.providers || []];
        let models = [...config1?.models || [], ...config2?.models || []];
        let repositories = [...config1?.repositories || [], ...config2?.repositories || []];

        return { ...config1, ...config2, setting, deps, providers, models, repositories };
    }

}
