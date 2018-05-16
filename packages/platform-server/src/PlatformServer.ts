import { IContainer, Type, Defer, lang, isString, IContainerBuilder, AsyncLoadOptions, ModuleType, hasClassMetadata, Autorun } from '@ts-ioc/core';
import { AppConfiguration, defaultAppConfig, AppConfigurationToken } from './AppConfiguration';
import { existsSync } from 'fs';
import * as path from 'path';
import { ContainerBuilder } from './ContainerBuilder';
import { toAbsolutePath } from './toAbsolute';

/**
 * server app bootstrap
 *
 * @export
 * @class Bootstrap
 */
export class PlatformServer {

    private container: Defer<IContainer>;
    private configDefer: Defer<AppConfiguration>;
    private builder: IContainerBuilder;
    private usedModules: (ModuleType | string)[];
    constructor(public rootdir: string) {
        this.usedModules = [];
    }

    static create(rootdir: string) {
        return new PlatformServer(rootdir);
    }

    useContainer(container: IContainer | Promise<IContainer>) {
        if (container) {
            if (!this.container) {
                this.container = Defer.create<IContainer>();
            }
            this.container.resolve(container);
        }
        return this;
    }

    /**
     * get container of bootstrap.
     *
     * @returns
     * @memberof Bootstrap
     */
    getContainer() {
        if (!this.container) {
            this.useContainer(this.createContainer());
        }
        return this.container.promise;
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
     * get configuration.
     *
     * @returns {Promise<AppConfiguration>}
     * @memberof Bootstrap
     */
    getConfiguration(): Promise<AppConfiguration> {
        if (!this.configDefer) {
            this.useConfiguration();
        }
        return this.configDefer.promise;
    }

    protected createContainer(option?: AsyncLoadOptions): Promise<IContainer> {
        return this.getContainerBuilder().build(option);
    }


    /**
     * use container builder
     *
     * @param {IContainerBuilder} builder
     * @returns
     * @memberof Bootstrap
     */
    useContainerBuilder(builder: IContainerBuilder) {
        this.builder = builder;
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

    use(...modules: (ModuleType | string)[]): this {
        this.usedModules = this.usedModules.concat(modules);
        return this;
    }

    async bootstrap(modules: Type<any>) {
        let cfg: AppConfiguration = await this.getConfiguration();
        let container: IContainer = await this.getContainer();
        container = await this.initIContainer(cfg, container);
        if (!container.has(modules)) {
            container.register(modules);
        }
        if (!hasClassMetadata(Autorun, modules)) {
            container.resolve(modules);
        }
    }

    protected async initIContainer(config: AppConfiguration, container: IContainer): Promise<IContainer> {
        config.rootdir = config.rootdir ? toAbsolutePath(this.rootdir, config.rootdir) : this.rootdir;
        container.registerSingleton(AppConfigurationToken, config);
        let builder = this.getContainerBuilder();
        if (this.usedModules.length) {
            await builder.loadModule(container, {
                modules: this.usedModules
            });
        }

        await builder.loadModule(container, { modules: ['@ts-ioc/aop'] });

        if (config.aop) {
            let aops = await builder.loadModule(container, {
                basePath: config.rootdir,
                files: config.aop
            });

            config.usedAops = aops;
        }

        container.resolve(AppConfigurationToken);
        return container;
    }
}
