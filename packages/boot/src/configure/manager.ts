import { ModuleLoader, PROCESS_ROOT } from '@tsdi/core';
import { isUndefined, Singleton, isString, isPlainObject, lang, isMetadataObject, Injector, Static } from '@tsdi/ioc';
import { ApplicationConfiguration, ConfigureLoader, ConfigureManager, ConfigureMerger, DEFAULT_CONFIG } from './config';



/**
 * configure manager.
 *
 * @export
 * @class ConfigureManager
 */
@Static(ConfigureManager)
export class DefaultConfigureManager extends ConfigureManager {

    protected configs: (string | ApplicationConfiguration)[];
    protected config: ApplicationConfiguration | undefined;

    /**
     * Creates an instance of ConfigureManager.
     * @param {string} [baseURL]
     */
    constructor(readonly injector: Injector) {
        super()
        this.configs = []
    }

    get baseURL() {
        return this.injector.get(PROCESS_ROOT)
    }

    private _loader: ConfigureLoader | undefined;
    get configLoader() {
        if (this._loader === undefined) {
            this._loader = this.injector.get(ConfigureLoader) ?? null
        }
        return this._loader
    }

    useConfiguration(config?: string | ApplicationConfiguration): this {
        if (isUndefined(config)) {
            config = ''
        }
        if (this.configs.indexOf(config) >= 0) return this;
        // clean cached config.
        this.config = undefined;
        if (isPlainObject(config) && config.baseURL && !this.injector.has(PROCESS_ROOT)) {
            this.injector.setValue(PROCESS_ROOT, config.baseURL)
        }
        this.configs.push(config);

        return this
    }

    getConfig<T extends ApplicationConfiguration>(): T {
        return this.config as T
    }

    async load(): Promise<void> {
        if (this.config) {
            return
        }
        let config: ApplicationConfiguration = this.config = { ...this.injector.get(DEFAULT_CONFIG) };
        const exts = await Promise.all(this.configs.map(cfg => {
            if (isString(cfg)) {
                return this.loadConfig(cfg)
            } else {
                return cfg
            }
        }));
        const merger = this.injector.get(ConfigureMerger);
        exts.forEach(exCfg => {
            if (exCfg) {
                exCfg = isMetadataObject((exCfg as any)['default']) ? (exCfg as any)['default'] : exCfg;
                if (merger) {
                    config = merger.merge(config, exCfg)
                } else {
                    for (const n in exCfg) {
                        config[n] = exCfg[n]
                    }
                }
            }
        })
    }

    /**
     * load config.
     *
     * @protected
     * @param {string} src
     * @returns {Promise<T>}
     */
    protected async loadConfig(src: string): Promise<ApplicationConfiguration> {
        if (this.configLoader) {
            return await this.configLoader.load(src)
        } else if (src) {
            const cfg = await this.injector.get(ModuleLoader).load([src])
            return lang.first(cfg) as ApplicationConfiguration
        } else {
            return null!
        }
    }
}


@Singleton(ConfigureMerger)
export class ConfigureMergerImpl extends ConfigureMerger {

    merge(target: ApplicationConfiguration, source: ApplicationConfiguration): ApplicationConfiguration {
        if (!source) return target;
        for (const n in source) {
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
                    break;
            }
        }

        return target
    }

    protected mergeArray(target: ApplicationConfiguration, name: string, source?: any[]) {
        if (!source || !source.length) return;
        if (target[name]) {
            source.forEach(d => {
                if ((target[name].indexOf(d) || 0) < 0) {
                    target[name]?.push(d)
                }
            })
        } else {
            target[name] = [...source]
        }
    }
}
