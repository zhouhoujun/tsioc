import { ModuleBuilder } from './ModuleBuilder';
import { AppConfiguration, AppConfigurationToken } from './AppConfiguration';
import { IModuleBuilder } from './IModuleBuilder';
import { Token, Type } from './types';
import { lang, isString, isClass, isMetadataObject } from './utils/index';
import { IContainer } from './IContainer';

/**
 * application builder.
 *
 * @export
 * @interface IApplicationBuilder
 * @extends {IModuleBuilder<T>}
 * @template T
 */
export interface IApplicationBuilder<T> extends IModuleBuilder<T> {

    /**
     * use custom configuration.
     *
     * @param {(string | T)} [config]
     * @returns {this}
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | T): this;

    /**
     * bootstrap app via main module.
     *
     * @param {(Token<T> | Type<any>)} boot bootstrap module.
     * @returns {Promise<any>}
     * @memberof IPlatform
     */
    bootstrap(boot: Token<T> | Type<any>): Promise<T>;
}

/**
 * application builder.
 *
 * @export
 * @class ApplicationBuilder
 * @extends {ModuleBuilder<T>}
 * @template T
 */
export class ApplicationBuilder<T> extends ModuleBuilder<T> {

    protected configuration: Promise<AppConfiguration<T>>;

    constructor(public baseURL?: string) {
        super();
    }

    /**
     * use custom configuration.
     *
     * @param {(string | AppConfiguration<T>)} [config]
     * @returns {this}
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | AppConfiguration<T>): this {
        if (!this.configuration) {
            this.configuration = Promise.resolve(this.getDefaultConfig());
        }
        let pcfg: Promise<AppConfiguration<T>>;
        let builder = this.getContainerBuilder();
        if (isString(config)) {
            pcfg = builder.loader.load(config)
                .then(rs => {
                    return rs.length ? rs[0] as T : null;
                })
        } else if (config) {
            pcfg = Promise.resolve(config);
        }

        if (pcfg) {
            this.configuration = this.configuration
                .then(cfg => {
                    return pcfg.then(rcfg => {
                        let excfg = (rcfg['default'] ? rcfg['default'] : rcfg) as T;
                        cfg = lang.assign(cfg || {}, excfg || {}) as T;
                        return cfg;
                    });
                });
        }

        return this;
    }

    async bootstrap(boot: Token<T> | Type<any>): Promise<T> {
        let app = await this.build(boot);
        return app;
    }


    protected setConfigRoot(config: AppConfiguration<T>) {
        if (this.baseURL) {
            config.baseURL = this.baseURL;
        }
    }

    protected async initContainer(config: AppConfiguration<T>, container: IContainer): Promise<IContainer> {
        this.setConfigRoot(config);
        container.bindProvider(AppConfigurationToken, config);
        return await super.initContainer(config, container);
    }

    /**
     * get configuration.
     *
     * @returns {Promise<T>}
     * @memberof Bootstrap
     */
    protected async getConfiguration(boot?: Token<any> | AppConfiguration<T>): Promise<AppConfiguration<T>> {
        let cfg = await super.getConfiguration(boot);
        if (!this.configuration) {
            this.useConfiguration(cfg);
        } else if (lang.hasField(cfg)) {
            this.useConfiguration(cfg);
        }
        return await this.configuration;
    }

    protected getDefaultConfig(): AppConfiguration<T> {
        return { debug: false } as AppConfiguration<T>;
    }


}
