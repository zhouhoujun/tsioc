import { IContainer, Type, Defer, lang, isString, IContainerBuilder, ModuleType, hasClassMetadata, Autorun, isClass, isFunction, ModuleBuilder, CustomDefineModule, ModuleConfiguration, ModuleConfigurationToken, IModuleBuilder, ObjectMap, Token, InjectToken } from '@ts-ioc/core';
import { existsSync } from 'fs';
import * as path from 'path';
import { ContainerBuilder } from './ContainerBuilder';
import { toAbsolutePath } from './toAbsolute';

/**
 * App configuration token.
 */
export const AppConfigurationToken = new InjectToken<AppConfiguration>('__IOC_AppConfiguration');

/**
 * app configuration.
 *
 * @export
 * @interface AppConfiguration
 * @extends {ObjectMap<any>}
 */
export interface AppConfiguration extends ModuleConfiguration {

    /**
     * custom config key value setting.
     *
     * @type {IMap<any>}
     * @memberOf AppConfiguration
     */
    setting?: ObjectMap<any>;

    /**
     * custom config connections.
     *
     * @type {ObjectMap<any>}
     * @memberof AppConfiguration
     */
    connections?: ObjectMap<any>;


    /**
     * aspect service path. default: './aop'
     *
     * @type {(string | string[])}
     * @memberof AppConfiguration
     */
    aop?: string | string[];

    /**
     * used aop aspect.
     *
     * @type {Token<any>[]}
     * @memberof AppConfiguration
     */
    usedAops?: Token<any>[];

    /**
     * log config.
     *
     * @type {*}
     * @memberof AppConfiguration
     */
    logConfig?: any;

}

/**
 * default app configuration.
 */
const defaultAppConfig: AppConfiguration = <AppConfiguration>{
    rootdir: '',
    debug: false,
    aop: './aop',
    usedAops: [],
    connections: {},
    setting: {}
}

/**
 * server platform.
 *
 * @export
 * @interface IPlatformServer
 * @extends {IPlatform}
 */
export interface IPlatformServer extends IModuleBuilder<AppConfiguration> {
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
export class PlatformServer<T extends AppConfiguration> extends ModuleBuilder<T> {

    private dirMatchs: string[][];
    constructor(public rootdir: string) {
        super();
        this.dirMatchs = [];
    }

    static create(rootdir: string) {
        return new PlatformServer<AppConfiguration>(rootdir);
    }

    /**
     * use custom configuration.
     *
     * @param {(string | T)} [config]
     * @returns {this}
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | T): this {
        if (!this.configuration) {
            this.configuration = Promise.resolve(this.getDefaultConfig());
        }
        let cfgmodeles: T;
        if (isString(config)) {
            if (existsSync(config)) {
                cfgmodeles = require(config) as T;
            } else if (existsSync(path.join(this.rootdir, config))) {
                cfgmodeles = require(path.join(this.rootdir, config)) as T;
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
            let excfg = (cfgmodeles['default'] ? cfgmodeles['default'] : cfgmodeles) as T;
            this.configuration = this.configuration
                .then(cfg => {
                    cfg = lang.assign(cfg || {}, excfg || {}) as T;
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

    protected getDefaultConfig(): T {
        return lang.assign({}, defaultAppConfig as T);
    }


    protected setConfigRoot(config: T) {
        config.rootdir = this.rootdir;
    }


    protected async initContainer(config: T, container: IContainer): Promise<IContainer> {
        container.bindProvider(AppConfigurationToken, config);
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
