import {
    Inject, isUndefined, lang, ContainerToken,
    IContainer, isString, Singleton
} from '@ts-ioc/core';
import {
    ConfigureMgrToken, ConfigureLoaderToken,
    IConfigureManager, DefaultConfigureToken
} from './IConfigureManager';
import { RunnableConfigure } from './AppConfigure';


/**
 * configure manager.
 *
 * @export
 * @class ConfigureManager
 */
@Singleton(ConfigureMgrToken)
export class ConfigureManager<T extends RunnableConfigure> implements IConfigureManager<T> {
    /**
     * Creates an instance of ConfigureManager.
     * @param {string} [baseURL]
     * @memberof ConfigureManager
     */
    constructor(protected baseURL?: string) {
        this.configs = [];
    }

    @Inject(ContainerToken)
    container: IContainer;

    private config: T;
    protected configs: (string | T)[];
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
        let idx = this.configs.indexOf(config);
        if (idx >= 0) {
            this.configs.splice(idx, 1);
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
        return this.config;
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
        exts.forEach(exCfg => {
            if (exCfg) {
                lang.assign(config, exCfg);
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
            let loader = this.container.resolve(ConfigureLoaderToken, { baseURL: this.baseURL, container: this.container });
            return await loader.load(src) as T;
        } else if (src) {
            let builder = this.container.getBuilder();
            let cfg = await builder.loader.load([src])
            return cfg.length ? cfg[0] as T : null;
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
