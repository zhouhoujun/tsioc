import { IContainer, Type, Defer, lang, isString, IContainerBuilder, ModuleType, hasClassMetadata, Autorun, isClass, isFunction, ModuleBuilder, IModuleBuilder, ObjectMap, Token, InjectToken, AppConfiguration, ApplicationBuilder, IApplicationBuilder } from '@ts-ioc/core';
import { existsSync } from 'fs';
import * as path from 'path';
import { ContainerBuilder } from './ContainerBuilder';
import { toAbsolutePath } from './toAbsolute';

/**
 * default app configuration.
 */
const defaultAppConfig: AppConfiguration<any> = {
    rootdir: '',
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
    rootdir: string;
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
    constructor(public rootdir: string) {
        super(rootdir);
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
        if (!this.configuration) {
            this.configuration = Promise.resolve(this.getDefaultConfig());
        }
        let cfgmodeles: AppConfiguration<T>;
        if (isString(config)) {
            if (existsSync(config)) {
                cfgmodeles = require(config) as AppConfiguration<T>;
            } else if (existsSync(path.join(this.rootdir, config))) {
                cfgmodeles = require(path.join(this.rootdir, config)) as AppConfiguration<T>;
            } else {
                console.log(`config file: ${config} not exists.`)
            }
        } else if (config) {
            cfgmodeles = config;
        } else {
            let cfgpath = path.join(this.rootdir, './config');
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
            this.configuration = this.configuration
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

    /**
     * get container builder.
     *
     * @returns
     * @memberof Bootstrap
     */
    protected getContainerBuilder() {
        if (!this.builder) {
            this.builder = new ContainerBuilder();
        }
        return this.builder;
    }

    protected getDefaultConfig(): AppConfiguration<T> {
        return lang.assign({}, defaultAppConfig as AppConfiguration<T>);
    }


    protected setConfigRoot(config: AppConfiguration<T>) {
        super.setConfigRoot(config);
        config.rootdir = this.rootdir;
    }

    protected async initContainer(config: AppConfiguration<T>, container: IContainer): Promise<IContainer> {
        await super.initContainer(config, container);
        let builder = this.getContainerBuilder();
        await Promise.all(this.dirMatchs.map(dirs => {
            return builder.loadModule(container, {
                basePath: config.rootdir,
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

    constructor(public rootdir: string) {
        super(rootdir);
    }

    static create(rootdir: string) {
        return new PlatformServer(rootdir);
    }

    bootstrap<T>(boot: Token<T> | Type<any> | AppConfiguration<T>): Promise<T> {
        return super.bootstrap(boot);
    }
}
