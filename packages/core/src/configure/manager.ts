import { Inject, isUndefined, Singleton, isString, isPlainObject, lang, EMPTY_OBJ, isMetadataObject, ModuleLoader, EMPTY } from '@tsdi/ioc';
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
        this.config = { ...config };
        this.configs = [];
    }

    useConfiguration(config?: string | Configuration): this {
        if (isUndefined(config)) {
            config = '';
        }
        if (this.configs.indexOf(config) >= 0) return this;
        // clean cached config.
        this.inited = false;
        if (!this.baseURL && isPlainObject(config)) {
            this.baseURL = config.baseURL;
        }
        this.configs.push(config);

        return this;
    }

    getConfig<T extends Configuration>(): T {
        return this.config as T;
    }

    async load(): Promise<void> {
        if (this.inited) {
            return;
        }
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
                if (merger) {
                    config = merger.merge(config, exCfg);
                } else {
                    for (let n in exCfg) {
                        config[n] = exCfg[n];
                    }
                }
            }
        });
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

    merge(target: Configuration, source: Configuration): Configuration {
        if (!source) return target;
        for (let n in source) {
            switch (n) {
                case 'setting':
                    target.setting = { ...target.setting, ...source.setting };
                    break;
                case 'deps':
                    this.mergeArray(target, n, source.deps);
                    break;
                case 'providers':
                    this.mergeArray(target, n, source.providers);
                    break;
                case 'models':
                    this.mergeArray(target, n, source.models);
                    break;
                case 'repositories':
                    this.mergeArray(target, n, source.repositories);
                    break;
                default:
                    target[n] = source[n];
            }
        }

        return target;
    }

    protected mergeArray(target: Configuration, name: string, source?: any[]) {
        if(!source || !source.length) return;
        if (target[name]) {
            source.forEach(d => {
                if ((target[name].indexOf(d) || 0) < 0) {
                    target[name]?.push(d);
                }
            })
        } else {
            target[name] = [...source];
        }
    }
}
