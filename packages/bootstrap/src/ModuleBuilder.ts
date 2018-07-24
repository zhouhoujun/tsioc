
import {
    IContainer, hasClassMetadata, isProviderMap, Provider,
    getTypeMetadata, Token, Type, Providers,
    isString, lang, isFunction, isClass, isUndefined, isNull, isBaseObject, isToken, isArray, Injectable, Inject, ContainerToken, ContainerBuilderToken, hasOwnClassMetadata, IocExt, IContainerBuilder
} from '@ts-ioc/core';
import { IModuleBuilder, ModuleBuilderToken } from './IModuleBuilder';
import { ModuleConfiguration } from './ModuleConfiguration';
import { DIModule } from './decorators';
import { ApplicationBuilderFactoryToken } from './IApplicationBuilder';

/**
 * server app bootstrap
 *
 * @export
 * @class ModuleBuilder
 */
@Injectable(ModuleBuilderToken)
export class ModuleBuilder<T> implements IModuleBuilder<T> {
    /**
     * ioc container
     *
     * @type {IContainer}
     * @memberof ModuleBuilder
     */
    @Inject(ContainerToken)
    container: IContainer;

    constructor() {

    }

    /**
     * get container of the module.
     *
     * @returns {IContainer}
     * @memberof ModuleBuilder
     */
    getContainer(): IContainer {
        return this.container;
    }

    /**
     * get container builder.
     *
     * @returns {IContainerBuilder}
     * @memberof IModuleBuilder
     */
    getContainerBuilder(): IContainerBuilder {
        return this.container.resolve(ContainerBuilderToken);
    }

    /**
     * build module.
     *
     * @param {(Token<T>| ModuleConfiguration<T>)} [token]
     * @returns {Promise<any>}
     * @memberof ModuleBuilder
     */
    async build(token: Token<T> | Type<any> | ModuleConfiguration<T>, data?: any): Promise<T> {
        let cfg = this.getConfigure(token);
        cfg = await this.mergeConfigure(cfg);
        let buider = this.getBuilder(cfg);
        let instacnce = await buider.createInstance(isToken(token) ? token : null, cfg, data);
        await buider.buildStrategy(instacnce, cfg);
        return instacnce;
    }

    /**
     * bundle instance via config.
     *
     * @param {T} instance
     * @param {ModuleConfiguration<T>} config
     * @returns {Promise<T>}
     * @memberof IModuleBuilder
     */
    async buildStrategy(instance: T, config: ModuleConfiguration<T>): Promise<T> {
        return instance;
    }

    getBuilder(config: ModuleConfiguration<T>): IModuleBuilder<T> {
        let builder: IModuleBuilder<T>;
        if (config.builder) {
            builder = this.getBuilderViaConfig(config.builder);
        } else {
            let token = this.getBootstrapToken(config);
            if (token) {
                builder = this.getBuilderViaToken(token);
            }
        }
        return builder || this;
    }


    getDecorator() {
        return DIModule.toString();
    }

    /**
     * get configuration.
     *
     * @returns {ModuleConfiguration<T>}
     * @memberof ModuleBuilder
     */
    getConfigure(token?: Token<any> | ModuleConfiguration<T>): ModuleConfiguration<T> {
        let cfg: ModuleConfiguration<T>;
        if (isClass(token)) {
            cfg = this.getMetaConfig(token);
        } else if (isToken(token)) {
            let tokenType = this.container.getTokenImpl(token);
            if (isClass(tokenType)) {
                cfg = this.getMetaConfig(tokenType);
            }
        } else {
            cfg = token as ModuleConfiguration<T>;
            let bootToken = this.getBootstrapToken(cfg);
            let typeTask = isClass(bootToken) ? bootToken : this.container.getTokenImpl(bootToken);
            if (isClass(typeTask)) {
                cfg = lang.assign({}, this.getMetaConfig(typeTask), cfg || {});
            }
        }
        return cfg || {};
    }


    async createInstance(token: Token<T>, cfg: ModuleConfiguration<T>, data?: any): Promise<T> {
        let bootToken = this.getBootstrapToken(cfg, token);
        if (!bootToken) {
            throw new Error('not find bootstrap token.');
        }
        await this.registerExts();
        await this.registerDepdences(cfg);
        if (isClass(bootToken)) {
            if (!this.container.has(bootToken)) {
                this.container.register(bootToken);
            }
            return this.container.resolve(bootToken);
        } else {
            return this.container.resolve(bootToken);
        }
    }

    protected getBootstrapToken(cfg: ModuleConfiguration<T>, token?: Token<T> | Type<any>): Token<T> {
        return cfg.bootstrap || token;
    }


    protected getBuilderViaConfig(builder: Token<IModuleBuilder<T>> | IModuleBuilder<T>): IModuleBuilder<T> {
        if (isToken(builder)) {
            return this.container.resolve(builder);
        } else if (builder instanceof ModuleBuilder) {
            return builder;
        }
        return null;
    }

    protected getBuilderViaToken(mdl: Token<T>): IModuleBuilder<T> {
        if (isToken(mdl)) {
            let taskType = isClass(mdl) ? mdl : this.container.getTokenImpl(mdl);
            if (taskType) {
                let meta = lang.first(getTypeMetadata<ModuleConfiguration<T>>(this.getDecorator(), taskType));
                if (meta && meta.builder) {
                    return isToken(meta.builder) ? this.container.resolve(meta.builder) : meta.builder;
                }
            }
        }
        return null;
    }

    protected getMetaConfig(bootModule: Type<any>): ModuleConfiguration<T> {
        let decorator = this.getDecorator();
        if (hasClassMetadata(decorator, bootModule)) {
            let metas = getTypeMetadata<ModuleConfiguration<any>>(decorator, bootModule);
            if (metas && metas.length) {
                let meta = metas[0];
                meta.bootstrap = meta.bootstrap || bootModule;
                return lang.omit(meta, 'builder');
            }
        }
        return null;
    }

    protected async mergeConfigure(cfg: ModuleConfiguration<T>): Promise<ModuleConfiguration<T>> {
        return cfg;
    }

    protected async registerExts(): Promise<IContainer> {
        return this.container;
    }

    protected async registerDepdences(config: ModuleConfiguration<T>): Promise<IContainer> {

        if (isArray(config.imports) && config.imports.length) {
            let buider = this.container.get(ContainerBuilderToken);
            let decorator = this.getDecorator();
            let mdls = await buider.loader.loadTypes(config.imports, it => hasOwnClassMetadata(IocExt, it) || hasOwnClassMetadata(decorator, it));

            mdls.forEach(async md => {
                if (this.container.has(ApplicationBuilderFactoryToken) && hasClassMetadata(decorator, md)) {
                    let dimd = lang.first(getTypeMetadata<ModuleConfiguration<T>>(decorator, md));
                    if (dimd) {
                        let subApp = this.container.get(ApplicationBuilderFactoryToken);
                        await subApp.build(md);
                        if (dimd.exports && dimd.exports.length) {
                            dimd.exports.forEach(token => {
                                this.container.bindProvider(token, () => subApp.getContainer().resolve(token));
                            });
                        }
                        if (dimd.providers && dimd.providers.length) {
                            this.bindProvider(this.container, config.providers);
                        }
                        this.container.bindProvider(md, () => subApp.build(md));
                    }
                } else {
                    this.container.register(md);
                }
            })
            await this.container.loadModule(...config.imports);
        }

        if (isArray(config.providers) && config.providers.length) {
            this.bindProvider(this.container, config.providers);
        }

        return this.container;
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

