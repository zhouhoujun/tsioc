import { ModuleLoader, PROCESS_ROOT } from '@tsdi/core';
import { isUndefined, isString, lang, isMetadataObject, Injectable, Optional, Inject } from '@tsdi/ioc';
import { ApplicationConfiguration, ConfigureLoader, ConfigureManager, ConfigureMerger, DEFAULT_CONFIG } from './config';



/**
 * configure manager.
 *
 * @export
 * @class ConfigureManager
 */
@Injectable(ConfigureManager)
export class DefaultConfigureManager extends ConfigureManager {

    protected configs: (string | ApplicationConfiguration)[];
    protected config: ApplicationConfiguration | undefined;

    /**
     * Creates an instance of ConfigureManager.
     * @param {string} [baseURL]
     */
    constructor(
        @Inject(PROCESS_ROOT, { nullable: true }) private baseURL: string,
        @Optional() private configLoader: ConfigureLoader,
        @Optional() private moduleLoader: ModuleLoader,
        @Optional() private configMerger: ConfigureMerger,
        @Inject(DEFAULT_CONFIG, { nullable: true }) private defaults: ApplicationConfiguration
    ) {
        super()
        this.configs = []
    }



    useConfiguration(config?: string | ApplicationConfiguration): this {
        if (isUndefined(config)) {
            config = ''
        }
        if (this.configs.indexOf(config) >= 0) return this;
        // clean cached config.
        this.config = undefined;
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
        let config: ApplicationConfiguration = this.config = { ...this.defaults };
        const exts = await Promise.all(this.configs.map(cfg => {
            if (isString(cfg)) {
                return this.loadConfig(cfg)
            } else {
                return cfg
            }
        }));
        const merger = this.configMerger;
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
            const cfg = await this.moduleLoader.load([src])
            return lang.first(cfg) as ApplicationConfiguration
        } else {
            return null!
        }
    }
}


@Injectable(ConfigureMerger)
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
