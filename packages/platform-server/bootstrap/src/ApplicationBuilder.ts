import { IContainer, lang, isString, IContainerBuilder } from '@ts-ioc/core';
import { AppConfiguration, DefaultApplicationBuilder, IApplicationBuilder } from '@ts-ioc/bootstrap';
import { existsSync } from 'fs';
import * as path from 'path';
import { ContainerBuilder } from '@ts-ioc/platform-server';

/**
 * default app configuration.
 */
const defaultAppConfig: AppConfiguration = {
    baseURL: '',
    debug: false,
    connections: {},
    setting: {}
}

/**
 * server application builder.
 *
 * @export
 * @interface IServerApplicationBuilder
 * @extends {IApplicationBuilder}
 * @template T
 */
export interface IApplicationBuilderServer extends IApplicationBuilder {
    /**
     * root url
     *
     * @type {string}
     * @memberof IPlatformServer
     */
    baseURL: string;
    /**
     * load module from dir
     *
     * @param {...string[]} matchPaths
     * @memberof IPlatformServer
     */
    loadDir(...matchPaths: string[]): this;
}



/**
 * application builder for server side.
 *
 * @export
 * @class Bootstrap
 */
export class ApplicationBuilder extends DefaultApplicationBuilder implements IApplicationBuilderServer {


    private dirMatchs: string[][];
    constructor(public baseURL: string) {
        super(baseURL);
        this.dirMatchs = [];
    }

    /**
     * create instance.
     *
     * @static
     * @template T
     * @param {string} rootdir
     * @returns {ApplicationBuilder}
     * @memberof ApplicationBuilder
     */
    static create(rootdir: string): IApplicationBuilderServer {
        return new ApplicationBuilder(rootdir);
    }

    /**
     * use custom configuration.
     *
     * @param {(string | AppConfiguration)} [config]
     * @returns {this}
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | AppConfiguration): this {
        if (!this.globalConfig) {
            this.globalConfig = Promise.resolve(this.getDefaultConfig());
        }
        let cfgmodeles: AppConfiguration;
        if (isString(config)) {
            if (existsSync(config)) {
                cfgmodeles = require(config) as AppConfiguration;
            } else if (existsSync(path.join(this.baseURL, config))) {
                cfgmodeles = require(path.join(this.baseURL, config)) as AppConfiguration;
            } else {
                console.log(`config file: ${config} not exists.`)
            }
        } else if (config) {
            cfgmodeles = config;
        } else {
            let cfgpath = path.join(this.baseURL, './config');
            ['.js', '.ts', '.json'].forEach(ext => {
                if (cfgmodeles) {
                    return false;
                }
                if (existsSync(cfgpath + ext)) {
                    cfgmodeles = require(cfgpath + ext);
                    return false;
                }
                return true;
            });
            if (!cfgmodeles) {
                console.log('your app has not config file.');
            }
        }

        if (cfgmodeles) {
            let excfg = (cfgmodeles['default'] ? cfgmodeles['default'] : cfgmodeles) as AppConfiguration;
            this.globalConfig = this.globalConfig
                .then(cfg => {
                    cfg = lang.assign(cfg || {}, excfg || {}) as AppConfiguration;
                    return cfg;
                });
        }

        return this;
    }

    /**
     * load module from dirs.
     *
     * @param {...string[]} matchPaths
     * @returns {this}
     * @memberof PlatformServer
     */
    loadDir(...matchPaths: string[]): this {
        this.dirMatchs.push(matchPaths);
        return this;
    }

    protected async registerExts(container: IContainer, config: AppConfiguration): Promise<IContainer> {
        await super.registerExts(container, config);
        await Promise.all(this.dirMatchs.map(dirs => {
            return container.loadModule(container, {
                basePath: config.baseURL,
                files: dirs
            });
        }));

        return container;
    }

    protected createContainerBuilder(): IContainerBuilder {
        return new ContainerBuilder();
    }

    protected createBuilder() {
        return this;
    }

    protected getDefaultConfig(): AppConfiguration {
        return lang.assign({}, defaultAppConfig as AppConfiguration);
    }
}

