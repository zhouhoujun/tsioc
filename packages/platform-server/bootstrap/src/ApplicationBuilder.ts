import { IContainer, lang, isString, IContainerBuilder } from '@ts-ioc/core';
import { AppConfiguration, DefaultApplicationBuilder, IApplicationBuilder } from '@ts-ioc/bootstrap';
import { existsSync } from 'fs';
import * as path from 'path';
import { ContainerBuilder } from '@ts-ioc/platform-server';

/**
 * default app configuration.
 */
const defaultAppConfig: AppConfiguration<any> = {
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
 * @extends {IModuleBuilder<T>}
 * @template T
 */
export interface IServerApplicationBuilder<T> extends IApplicationBuilder<T> {
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
 * server app bootstrap
 *
 * @export
 * @class Bootstrap
 */
export class ApplicationBuilder<T> extends DefaultApplicationBuilder<T> implements IServerApplicationBuilder<T> {


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
     * @returns {ApplicationBuilder<T>}
     * @memberof ApplicationBuilder
     */
    static create<T>(rootdir: string): ApplicationBuilder<T> {
        return new ApplicationBuilder<T>(rootdir);
    }

    /**
     * use custom configuration.
     *
     * @param {(string | AppConfiguration<T>)} [config]
     * @returns {this}
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | AppConfiguration<T>): this {
        if (!this.globalConfig) {
            this.globalConfig = Promise.resolve(this.getDefaultConfig());
        }
        let cfgmodeles: AppConfiguration<T>;
        if (isString(config)) {
            if (existsSync(config)) {
                cfgmodeles = require(config) as AppConfiguration<T>;
            } else if (existsSync(path.join(this.baseURL, config))) {
                cfgmodeles = require(path.join(this.baseURL, config)) as AppConfiguration<T>;
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
            let excfg = (cfgmodeles['default'] ? cfgmodeles['default'] : cfgmodeles) as AppConfiguration<T>;
            this.globalConfig = this.globalConfig
                .then(cfg => {
                    cfg = lang.assign(cfg || {}, excfg || {}) as AppConfiguration<T>;
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

    protected async registerExts(container: IContainer, config: AppConfiguration<T>): Promise<IContainer> {
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

    protected getDefaultConfig(): AppConfiguration<T> {
        return lang.assign({}, defaultAppConfig as AppConfiguration<T>);
    }
}

