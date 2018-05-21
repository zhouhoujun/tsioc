import { IContainer, Type, Defer, lang, isString, IContainerBuilder, ModuleType, hasClassMetadata, Autorun, isClass, isFunction, Platform, CustomDefineModule, AppConfiguration, AppConfigurationToken, defaultAppConfig, IPlatform } from '@ts-ioc/core';
import { existsSync } from 'fs';
import * as path from 'path';
import { ContainerBuilder } from './ContainerBuilder';
import { toAbsolutePath } from './toAbsolute';


/**
 * server platform.
 *
 * @export
 * @interface IPlatformServer
 * @extends {IPlatform}
 */
export interface IPlatformServer extends IPlatform {
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
export class PlatformServer extends Platform {

    private dirMatchs: string[][];
    constructor(public rootdir: string) {
        super();
        this.dirMatchs = [];
    }

    static create(rootdir: string) {
        return new PlatformServer(rootdir);
    }

    /**
     * use custom configuration.
     *
     * @param {(string | AppConfiguration)} [config]
     * @returns {this}
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | AppConfiguration): this {
        if (!this.configDefer) {
            this.configDefer = Defer.create<AppConfiguration>();
            this.configDefer.resolve(lang.assign({}, defaultAppConfig));
        }
        let cfgmodeles: AppConfiguration;
        if (isString(config)) {
            if (existsSync(config)) {
                cfgmodeles = require(config) as AppConfiguration;
            } else if (existsSync(path.join(this.rootdir, config))) {
                cfgmodeles = require(path.join(this.rootdir, config)) as AppConfiguration;
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
            let excfg = (cfgmodeles['default'] ? cfgmodeles['default'] : cfgmodeles) as AppConfiguration;
            this.configDefer.promise = this.configDefer.promise
                .then(cfg => {
                    cfg = lang.assign(cfg || {}, excfg || {});
                    return cfg;
                });
        }

        return this;
    }

    /**
     * get container builder.
     *
     * @returns
     * @memberof Bootstrap
     */
    getContainerBuilder() {
        if (!this.builder) {
            this.builder = new ContainerBuilder();
        }
        return this.builder;
    }

    loadDir(...matchPaths: string[]): this {
        this.dirMatchs.push(matchPaths);
        return this;
    }


    protected setRootdir(config: AppConfiguration) {
        config.rootdir = this.rootdir;
    }


    protected async initIContainer(config: AppConfiguration, container: IContainer): Promise<IContainer> {
        await super.initIContainer(config, container);
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
