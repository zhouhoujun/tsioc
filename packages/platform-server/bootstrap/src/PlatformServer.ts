import { IContainer, Type, lang, isString, Token } from '@ts-ioc/core';
import { AppConfiguration, ApplicationBuilder, IApplicationBuilder } from '@ts-ioc/bootstrap';
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
export class ServerApplicationBuilder<T> extends ApplicationBuilder<T> implements IServerApplicationBuilder<T> {

    private dirMatchs: string[][];
    constructor(public baseURL: string) {
        super(baseURL);
        this.dirMatchs = [];
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

    protected createContainerBuilder() {
        return new ContainerBuilder();
    }

    protected getDefaultConfig(): AppConfiguration<T> {
        return lang.assign({}, defaultAppConfig as AppConfiguration<T>);
    }

    protected async initContainer(config: AppConfiguration<T>, container: IContainer): Promise<IContainer> {
        await super.initContainer(config, container);
        let builder = this.getContainerBuilder();
        await Promise.all(this.dirMatchs.map(dirs => {
            return builder.loadModule(container, {
                basePath: config.baseURL,
                files: dirs
            });
        }));

        return container;
    }
}


/**
 * server platform.
 *
 * @export
 * @interface IPlatformServer
 * @extends {IPlatform}
 */
export interface IPlatformServer extends IServerApplicationBuilder<any> {

}

/**
 * server app bootstrap
 *
 * @export
 * @class Bootstrap
 */
export class PlatformServer extends ServerApplicationBuilder<any> implements IPlatformServer {

    constructor(public baseURL: string) {
        super(baseURL);
    }

    /**
     * create instance.
     *
     * @static
     * @param {string} rootdir application start root path.
     * @returns {PlatformServer}
     * @memberof PlatformServer
     */
    static create(rootdir: string): PlatformServer {
        return new PlatformServer(rootdir);
    }

    /**
     * bootstrap application via main module.
     *
     * @template T
     * @param {(Token<T> | Type<any> | AppConfiguration<T>)} token main module or appliaction configuration.
     * @returns {Promise<any>}  main module bootstrap class instance.
     * @memberof PlatformServer
     */
    bootstrap<T>(token: Token<T> | Type<any> | AppConfiguration<T>): Promise<any> {
        return super.bootstrap(token);
    }
}
