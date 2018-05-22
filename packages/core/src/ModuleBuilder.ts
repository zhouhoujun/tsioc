import { Token, Type, ModuleType, LoadType, Providers } from './types';
import { CustomDefineModule, IModuleBuilder, ModuleBuilderToken } from './IModuleBuilder';
import { IContainer } from './IContainer';
import { hasClassMetadata, Autorun, isProviderMap, Provider, ParamProvider, DefModule, getTypeMetadata } from './core/index';
import { Defer, isString, lang, isFunction, isClass, isUndefined, isNull, isNumber, isBaseObject, isToken, isArray } from './utils/index';
import { IContainerBuilder } from './IContainerBuilder';
import { DefaultContainerBuilder } from './DefaultContainerBuilder';
import { ModuleConfiguration, ModuleConfigurationToken } from './ModuleConfiguration';

/**
 * server app bootstrap
 *
 * @export
 * @class Bootstrap
 */
export class ModuleBuilder<T extends ModuleConfiguration> implements IModuleBuilder<T> {

    protected container: Defer<IContainer>;
    protected configDefer: Defer<T>;
    protected builder: IContainerBuilder;
    protected usedModules: (LoadType)[];
    protected customs: CustomDefineModule<T>[];
    constructor() {
        this.usedModules = [];
        this.customs = [];
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

    protected getDefaultConfig(): T {
        return { debug: false } as T;
    }
    /**
     * use custom configuration.
     *
     * @param {(string | T)} [config]
     * @returns {this}
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | T): this {
        if (!this.configDefer) {
            this.configDefer = Defer.create<T>();
            this.configDefer.resolve(this.getDefaultConfig());
        }
        let cfgmodeles: Promise<T>;
        let builder = this.getContainerBuilder();
        if (isString(config)) {
            cfgmodeles = builder.loader.load(config)
                .then(rs => {
                    return rs.length ? rs[0] as T : null;
                })
        } else if (config) {
            cfgmodeles = Promise.resolve(config);
        }

        if (cfgmodeles) {
            this.configDefer.promise = this.configDefer.promise
                .then(cfg => {
                    return cfgmodeles.then(rcfg => {
                        let excfg = (rcfg['default'] ? rcfg['default'] : rcfg) as T;
                        cfg = lang.assign(cfg || {}, excfg || {}) as T;
                        return cfg;
                    });
                });
        }

        return this;
    }

    /**
     * get configuration.
     *
     * @returns {Promise<T>}
     * @memberof Bootstrap
     */
    getConfiguration(): Promise<T> {
        if (!this.configDefer) {
            this.useConfiguration();
        }
        return this.configDefer.promise;
    }

    protected createContainer(modules?: LoadType | LoadType[], basePath?: string): Promise<IContainer> {
        return this.getContainerBuilder().build(modules, basePath);
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
            this.builder = new DefaultContainerBuilder();
        }
        return this.builder;
    }

    /**
     * use module, custom module.
     *
     * @param {(...(LoadType | CustomDefineModule<T>)[])} modules
     * @returns {this}
     * @memberof PlatformServer
     */
    use(...modules: (LoadType | CustomDefineModule<T>)[]): this {
        modules.forEach(m => {
            if (isFunction(m) && !isClass(m)) {
                this.customs.push(m);
            } else {
                this.usedModules.push(m);
            }
        });
        return this;
    }

    async build(cfg?: ModuleConfiguration) {
        if (!cfg) {
            cfg = await this.getConfiguration();
        }
        let container: IContainer = await this.getContainer();
        container = await this.initIContainer(cfg, container);
        return container;
    }

    async bootstrap<TModule>(bootModule?: Token<TModule>): Promise<TModule> {
        if (isClass(bootModule)) {
            if (hasClassMetadata(DefModule, bootModule)) {
                let meta = getTypeMetadata<T>(DefModule, bootModule);
                if (meta && meta.length) {
                    this.useConfiguration(meta[0]);
                }
            }
        }
        let cfg: ModuleConfiguration = await this.getConfiguration();
        let container = await this.build(cfg);
        let token: Token<TModule> = cfg.bootstrap || bootModule;

        if (isClass(token)) {
            if (hasClassMetadata(Autorun, token)) {
                return Promise.reject('Autorun class not need bootstrap.');
            }
            if (!container.has(token)) {
                container.register(token);
            }
            return container.resolve(token);
        } else {
            return container.resolve(token);
        }
    }

    protected setRootdir(config: ModuleConfiguration) {

    }

    protected async initIContainer(config: ModuleConfiguration, container: IContainer): Promise<IContainer> {
        this.setRootdir(config);
        container.bindProvider(ModuleBuilderToken, () => this);
        container.registerSingleton(ModuleConfigurationToken, config);
        let builder = this.getContainerBuilder();
        if (this.usedModules.length) {
            await builder.loadModule(container, ...this.usedModules);
        }

        if (isArray(config.imports) && config.imports.length) {
            await builder.loadModule(container, ...config.imports);
        }

        if (isArray(config.providers) && config.providers.length) {
            this.bindProvider(container, config.providers);
        }

        if (this.customs.length) {
            await Promise.all(this.customs.map(cs => {
                return cs(container, config, this);
            }));
        }

        return container;
    }

    protected bindProvider(container: IContainer, providers: Providers[]) {
        providers.forEach((p, index) => {
            if (isUndefined(p) || isNull(p)) {
                return;
            }
            if (isProviderMap(p)) {
                p.forEach((k, f) => {
                    container.bindProvider(k, f);
                });
            } else if (p instanceof Provider) {
                container.bindProvider(p.type, (...providers: Providers[]) => p.resolve(container, ...providers));
            } else if (isClass(p)) {
                if (!container.has(p)) {
                    container.register(p);
                }
            } else if (isBaseObject(p)) {
                let pr: any = p;
                let isobjMap = false;
                if (isToken(pr.provide)) {
                    if (isArray(pr.deps) && pr.deps.length) {
                        pr.deps.forEach(d => {
                            if (isClass(d) && !container.has(d)) {
                                container.register(d);
                            }
                        });
                    }
                    if (!isUndefined(pr.useValue)) {
                        container.bindProvider(pr.provide, () => pr.useValue);
                    } else if (isClass(pr.useClass)) {
                        if (!container.has(pr.useClass)) {
                            container.register(pr.useClass);
                        }
                        container.bindProvider(pr.provide, pr.useClass);
                    } else if (isFunction(pr.useFactory)) {
                        container.bindProvider(pr.provide, () => {
                            let args = [];
                            if (isArray(pr.deps) && pr.deps.length) {
                                args = pr.deps.map(d => {
                                    if (isClass(d)) {
                                        return container.get(d);
                                    } else {
                                        return d;
                                    }
                                });
                            }
                            return pr.useFactory.apply(pr, args);
                        });
                    } else if (isToken(pr.useExisting)) {
                        if (container.has(pr.useExisting)) {
                            container.bindProvider(pr.provide, pr.useExisting);
                        } else {
                            console.log('has not register:', pr.useExisting);
                        }
                    } else {
                        isobjMap = true;
                    }
                } else {
                    isobjMap = true;
                }

                if (isobjMap) {
                    lang.forIn<any>(p, (val, name: string) => {
                        if (!isUndefined(val)) {
                            if (isClass(val)) {
                                container.bindProvider(name, val);
                            } else if (isFunction(val) || isString(val)) {
                                container.bindProvider(name, () => val);
                            } else {
                                container.bindProvider(name, val);
                            }
                        }
                    });
                }
            } else if (isFunction(p)) {
                container.bindProvider(name, () => p);
            }
        });
    }
}

