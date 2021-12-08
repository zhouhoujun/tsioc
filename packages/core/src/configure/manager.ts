import { Inject, isUndefined, Singleton, isString, isPlainObject, lang, EMPTY_OBJ, isMetadataObject, ModuleLoader } from '@tsdi/ioc';
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

    private inited = false;
    protected configs: (string | Configuration)[];

    /**
     * Creates an instance of ConfigureManager.
     * @param {string} [baseURL]
     */
    constructor(
        @Inject(DEFAULT_CONFIG, { defaultValue: {} }) private config: Configuration,
        @Inject() private moduleLoader: ModuleLoader,
        @Inject({ nullable: true }) private merger?: ConfigureMerger,
        @Inject({ nullable: true }) private configLoader?: ConfigureLoader,
        @Inject(PROCESS_ROOT, { nullable: true }) protected baseURL?: string) {
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
        if (!this.inited) {
            this.config = await this.initConfig();
        }
        return (this.config || EMPTY_OBJ) as T;
    }

    /**
     * init config.
     */
    protected async initConfig() {
        this.inited = true;
        let config = this.config;
        let exts = await Promise.all(this.configs.map(cfg => {
            if (isString(cfg)) {
                return this.loadConfig(cfg);
            } else {
                return cfg;
            }
        }));
        const merger = this.merger;
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
        if (this.configLoader) {
            return await this.configLoader.load(src);
        } else if (src) {
            let cfg = await this.moduleLoader.load([src])
            return lang.first(cfg) as Configuration;
        } else {
            return null!;
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
