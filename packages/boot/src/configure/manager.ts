import { Inject, isUndefined, Singleton, isString, isMetadataObject, isPlainObject, lang, Injector, ROOT_INJECTOR } from '@tsdi/ioc';
import { Configuration, IConfigureManager, IConfigureMerger } from './config';
import { CONFIG_MANAGER, CONFIG_LOADER, DEFAULT_CONFIG, CONFIG_MERGER, PROCESS_ROOT } from '../metadata/tk';


/**
 * configure manager.
 *
 * @export
 * @class ConfigureManager
 */
@Singleton(CONFIG_MANAGER)
export class ConfigureManager<T extends Configuration = Configuration> implements IConfigureManager<T> {

    @Inject(ROOT_INJECTOR) injector: Injector;
    private config: T;
    protected configs: (string | T)[];

    /**
     * Creates an instance of ConfigureManager.
     * @param {string} [baseURL]
     */
    constructor(@Inject(PROCESS_ROOT) protected baseURL?: string) {
        this.configs = [];
    }
    /**
     * use configuration.
     *
     * @param {(string | AppConfigure)} [config]
     * @returns {this} this configure manager.
     */
    useConfiguration(config?: string | T): this {
        if (isUndefined(config)) {
            config = '';
        }
        // clean cached config.
        this.config = null;
        lang.remove(this.configs, config);
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
     */
    async getConfig(): Promise<T> {
        if (!this.config) {
            this.config = await this.initConfig();
        }
        return this.config || {} as T;
    }

    /**
     * init config.
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
        const merger = this.injector.get(CONFIG_MERGER);
        exts.forEach(exCfg => {
            if (exCfg) {
                exCfg = isMetadataObject(exCfg['default']) ? exCfg['default'] : exCfg;
                config = (merger ? merger.merge(config, exCfg) : { ...config, ...exCfg }) as T;
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
     */
    protected async loadConfig(src: string): Promise<T> {
        if (this.injector.has(CONFIG_LOADER)) {
            let loader = this.injector.get(CONFIG_LOADER);
            return await loader.load(src) as T;
        } else if (src) {
            let cfg = await this.injector.getLoader().load([src])
            return cfg.length ? cfg[0] as Configuration as T : null;
        } else {
            return null;
        }
    }

    /**
     * get default config.
     *
     * @protected
     * @returns {Promise<T>}
     */
    protected async getDefaultConfig(): Promise<T> {
        if (this.injector.has(DEFAULT_CONFIG)) {
            return this.injector.resolve(DEFAULT_CONFIG) as T;
        } else {
            return {} as T;
        }
    }
}


@Singleton(CONFIG_MERGER)
export class ConfigureMerger implements IConfigureMerger {
    merge(config1: Configuration, config2: Configuration): Configuration {
        let setting = { ...config1?.setting, ...config2?.setting };
        let deps = [...config1?.deps || [], ...config2?.deps || []];
        let providers = [...config1?.providers || [], ...config2?.providers || []];
        let models = [...config1?.models || [], ...config2?.models || []];
        let repositories = [...config1?.repositories || [], ...config2?.repositories || []];

        return { ...config1, ...config2, setting, deps, providers, models, repositories };
    }

}
