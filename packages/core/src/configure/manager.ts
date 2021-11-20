import { Inject, isUndefined, Singleton, isString, isPlainObject, lang, Injector, ROOT_INJECTOR, EMPTY_OBJ, isMetadataObject } from '@tsdi/ioc';
import { Configuration, ConfigureLoader, ConfigureManager, ConfigureMerger } from './config';
import { DEFAULT_CONFIG, PROCESS_ROOT } from '../metadata/tk';


/**
 * configure manager.
 *
 * @export
 * @class ConfigureManager
 */
@Singleton(ConfigureManager)
export class DefaultConfigureManager implements ConfigureManager {

    @Inject(ROOT_INJECTOR) injector!: Injector;
    private config!: Configuration;
    protected configs: (string | Configuration)[];

    /**
     * Creates an instance of ConfigureManager.
     * @param {string} [baseURL]
     */
    constructor(@Inject(PROCESS_ROOT, { defaultValue: '' }) protected baseURL?: string) {
        this.configs = [];
    }
    /**
     * use configuration.
     *
     * @param {(string | AppConfigure)} [config]
     * @returns {this} this configure manager.
     */
    useConfiguration(config?: string | Configuration): this {
        if (isUndefined(config)) {
            config = '';
        }
        // clean cached config.
        this.config = null!;
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
    async getConfig<T extends Configuration>(): Promise<T> {
        if (!this.config) {
            this.config = await this.initConfig();
        }
        return (this.config || EMPTY_OBJ) as T;
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
        const merger = this.injector.get(ConfigureMerger);
        exts.forEach(exCfg => {
            if (exCfg) {
                exCfg = isMetadataObject((exCfg as any)['default']) ? (exCfg as any)['default'] : exCfg;
                config = (merger ? merger.merge(config, exCfg) : { ...config, ...exCfg });
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
    protected async loadConfig(src: string): Promise<Configuration> {
        if (this.injector.has(ConfigureLoader)) {
            let loader = this.injector.get(ConfigureLoader);
            return await loader.load(src);
        } else if (src) {
            let cfg = await this.injector.getLoader().load([src])
            return lang.first(cfg) as Configuration;
        } else {
            return null!;
        }
    }

    /**
     * get default config.
     *
     * @protected
     * @returns {Promise<T>}
     */
    protected async getDefaultConfig(): Promise<Configuration> {
        if (this.injector.has(DEFAULT_CONFIG)) {
            return this.injector.resolve(DEFAULT_CONFIG);
        } else {
            return {};
        }
    }
}


@Singleton(ConfigureMerger)
export class ConfigureMergerImpl implements ConfigureMerger {
    merge(config1: Configuration, config2: Configuration): Configuration {
        let setting = { ...config1?.setting, ...config2?.setting };
        let deps = [...config1?.deps || [], ...config2?.deps || []];
        let providers = [...config1?.providers || [], ...config2?.providers || []];
        let models = [...config1?.models || [], ...config2?.models || []];
        let repositories = [...config1?.repositories || [], ...config2?.repositories || []];

        return { ...config1, ...config2, setting, deps, providers, models, repositories };
    }

}
