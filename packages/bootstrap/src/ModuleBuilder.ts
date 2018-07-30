
import {
    IContainer, isProviderMap, Provider,
    getTypeMetadata, Token, Type, Providers,
    isString, lang, isFunction, isClass, isUndefined,
    isNull, isBaseObject, isToken, isArray,
    Injectable, Inject, ContainerToken, ContainerBuilderToken,
    hasOwnClassMetadata, IocExt, IContainerBuilder
} from '@ts-ioc/core';
import { IModuleBuilder, ModuleBuilderToken } from './IModuleBuilder';
import { ModuleConfiguration } from './ModuleConfiguration';
import { DIModule } from './decorators';
import { BootstrapModule } from './BootstrapModule';


const exportsProvidersFiled = '__exportProviders';
/**
 * base module builder
 *
 * @export
 * @class ModuleBuilder
 */
export class BaseModuleBuilder<T> implements IModuleBuilder<T> {
    /**
     * ioc container
     *
     * @type {IContainer}
     * @memberof ModuleBuilder
     */
    protected container: IContainer;

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
     * reset new container.
     *
     * @memberof BaseModuleBuilder
     */
    async resetContainer(parent: IContainer): Promise<IContainer> {
        this.container = this.getContainerBuilder().create();
        if (this.container !== parent) {
            this.container.parent = parent;
        }
        return this.container;
    }

    /**
     * get container builder.
     *
     * @returns {IContainerBuilder}
     * @memberof IModuleBuilder
     */
    getContainerBuilder(): IContainerBuilder {
        return this.getContainer().resolve(ContainerBuilderToken);
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
        // cfg = await this.mergeConfigure(cfg);
        let builder = this.getBuilder(cfg);
        let instacnce = await builder.createInstance(isToken(token) ? token : null, cfg, data);
        await builder.buildStrategy(instacnce, cfg);
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

    async importModule(token: Type<any> | ModuleConfiguration<any>, forceNew = false): Promise<IContainer> {
        let container = this.getContainer();
        if (isClass(token) && !this.isDIModule(token)) {
            container.register(token);
            return container;
        }
        let cfg = this.getConfigure(token);
        let builder = this.getBuilder(cfg, forceNew);
        if (forceNew) {
            await builder.resetContainer(container);
        }
        let importContainer = builder.getContainer();
        await builder.registerDepdences(importContainer, cfg);

        let bootToken = builder.getBootstrapToken(cfg, isClass(token) ? token : null);
        if (isToken(bootToken)) {
            container.bindProvider(bootToken, () => builder.createInstance(bootToken, cfg));
        }

        await this.importConfigExports(container, importContainer, cfg);

        return container;
    }

    getBuilder(config: ModuleConfiguration<T>, forceNew = false): IModuleBuilder<T> {
        let builder: IModuleBuilder<T>;
        if (config.builder) {
            builder = this.getBuilderViaConfig(config.builder);
        } else {
            let token = this.getBootstrapToken(config);
            if (token) {
                builder = this.getBuilderViaToken(token);
            }
        }
        if (!builder) {
            builder = forceNew ? this.createBuilder() : this;
        }

        return builder;
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
        let container = this.getContainer();
        if (isClass(token)) {
            cfg = this.getMetaConfig(token);
        } else if (isToken(token)) {
            let tokenType = container.getTokenImpl(token);
            if (isClass(tokenType)) {
                cfg = this.getMetaConfig(tokenType);
            }
        } else {
            cfg = token as ModuleConfiguration<T>;
            let bootToken = this.getBootstrapToken(cfg);
            let typeTask = isClass(bootToken) ? bootToken : container.getTokenImpl(bootToken);
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
        let container = this.getContainer();
        await this.registerDepdences(container, cfg);
        return this.resolveToken(container, bootToken, cfg);
    }

    async registerDepdences(container: IContainer, config: ModuleConfiguration<T>): Promise<IContainer> {
        await this.registerExts(container, config);
        // if (this.canRegRootDepds()) {
        //     await this.registerRootDepds(container, config);
        // }
        await this.registerConfgureDepds(container, config);
        return container;
    }

    protected resolveToken(container: IContainer, token: Token<T>, config: ModuleConfiguration<T>): any {
        if (isClass(token)) {
            if (!container.has(token)) {
                container.register(token);
            }
            return container.resolve(token);
        } else {
            return container.resolve(token);
        }
    }

    // protected async registerRootDepds(container: IContainer, config?: ModuleConfiguration<T>): Promise<IContainer> {
    //     if (!this.canRegRootDepds()) {
    //         return container;
    //     }
    //     let appcfg = this.parnet.get(AppConfigurationToken);
    //     await this.importConfigExports(container, this.parnet, appcfg);
    //     return container;
    // }

    // protected canRegRootDepds() {
    //     return !!this.parnet;
    // }

    protected async importConfigExports(container: IContainer, parentContainer: IContainer, cfg: ModuleConfiguration<any>) {
        if (cfg.exports && cfg.exports.length) {
            await Promise.all(cfg.exports.map(async tk => {
                // if (isClass(tk)) {
                //     if (this.isDIModule(tk)) {
                //         await this.importModule(tk);
                //         return tk;
                //     }
                //     if (this.isIocExt(tk)) {
                //         container.register(tk);
                //         return tk;
                //     }
                // }
                container.bindProvider(tk, (...providers: Providers[]) => parentContainer.resolve(tk, ...providers));
                return tk;
            }));
        }
        let expProviders: Token<any>[] = cfg[exportsProvidersFiled];
        if (expProviders && expProviders.length) {
            expProviders.forEach(tk => {
                container.bindProvider(tk, () => parentContainer.get(tk));
            })
        }
        return container;
    }

    protected needRegister(type: Type<any>) {
        if (this.isIocExt(type)) {
            return true;
        }
        return false;
    }


    protected async registerConfgureDepds(container: IContainer, config: ModuleConfiguration<T>): Promise<IContainer> {
        if (isArray(config.imports) && config.imports.length) {
            let buider = container.get(ContainerBuilderToken);
            let mdls = await buider.loader.loadTypes(config.imports, it => this.isIocExt(it) || this.isDIModule(it));
            await Promise.all(mdls.map(md => this.importModule(md, true)));
        }

        if (isArray(config.providers) && config.providers.length) {
            config[exportsProvidersFiled] = this.bindProvider(container, config.providers);
        }

        return container;
    }


    protected createBuilder(): IModuleBuilder<T> {
        return new BaseModuleBuilder();
    }

    getBootstrapToken(cfg: ModuleConfiguration<T>, token?: Token<T> | Type<any>): Token<T> {
        return cfg.bootstrap || token;
    }


    protected getBuilderViaConfig(builder: Token<IModuleBuilder<T>> | IModuleBuilder<T>): IModuleBuilder<T> {
        if (isToken(builder)) {
            return this.getContainer().resolve(builder);
        } else if (builder instanceof ModuleBuilder) {
            return builder;
        }
        return null;
    }

    protected getBuilderViaToken(mdl: Token<T>): IModuleBuilder<T> {
        if (isToken(mdl)) {
            let taskType = isClass(mdl) ? mdl : this.getContainer().getTokenImpl(mdl);
            if (taskType) {
                let meta = lang.first(getTypeMetadata<ModuleConfiguration<T>>(this.getDecorator(), taskType));
                if (meta && meta.builder) {
                    return isToken(meta.builder) ? this.getContainer().resolve(meta.builder) : meta.builder;
                }
            }
        }
        return null;
    }

    // protected async mergeConfigure(cfg: ModuleConfiguration<T>): Promise<ModuleConfiguration<T>> {
    //     return cfg;
    // }

    protected getMetaConfig(bootModule: Type<any>): ModuleConfiguration<T> {
        let decorator = this.getDecorator();
        if (this.isDIModule(bootModule)) {
            let metas = getTypeMetadata<ModuleConfiguration<any>>(decorator, bootModule);
            if (metas && metas.length) {
                let meta = metas[0];
                meta.bootstrap = meta.bootstrap || bootModule;
                return lang.omit(meta, 'builder');
            }
        }
        return null;
    }

    protected isIocExt(token: Type<any>) {
        return hasOwnClassMetadata(IocExt, token);
    }

    protected isDIModule(token: Type<any>) {
        if (!isClass(token)) {
            return false;
        }
        if (hasOwnClassMetadata(this.getDecorator(), token)) {
            return true;
        }
        return hasOwnClassMetadata(DIModule, token);
    }

    protected async registerExts(container: IContainer, config: ModuleConfiguration<T>): Promise<IContainer> {
        if (!container.has(BootstrapModule)) {
            container.register(BootstrapModule);
        }
        return container;
    }

    protected bindProvider(container: IContainer, providers: Providers[]): Token<any>[] {
        let tokens: Token<any>[] = [];
        providers.forEach((p, index) => {
            if (isUndefined(p) || isNull(p)) {
                return;
            }
            if (isProviderMap(p)) {
                p.forEach((k, f) => {
                    tokens.push(k);
                    container.bindProvider(k, f);
                });
            } else if (p instanceof Provider) {
                tokens.push(p.type);
                container.bindProvider(p.type, (...providers: Providers[]) => p.resolve(container, ...providers));
            } else if (isClass(p)) {
                if (!container.has(p)) {
                    tokens.push(p);
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
                        tokens.push(pr.provide);
                        container.bindProvider(pr.provide, () => pr.useValue);
                    } else if (isClass(pr.useClass)) {
                        if (!container.has(pr.useClass)) {
                            container.register(pr.useClass);
                        }
                        tokens.push(pr.provide);
                        container.bindProvider(pr.provide, pr.useClass);
                    } else if (isFunction(pr.useFactory)) {
                        tokens.push(pr.provide);
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
                            tokens.push(pr.provide);
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
                            tokens.push(name);
                        }
                    });
                }
            } else if (isFunction(p)) {
                tokens.push(name);
                container.bindProvider(name, () => p);
            }
        });

        return tokens;
    }
}

/**
 * default module builder
 *
 * @export
 * @class ModuleBuilder
 * @extends {BaseModuleBuilder<T>}
 * @implements {IModuleBuilder<T>}
 * @template T
 */
@Injectable(ModuleBuilderToken)
export class ModuleBuilder<T> extends BaseModuleBuilder<T> implements IModuleBuilder<T> {
    /**
     * ioc container
     *
     * @type {IContainer}
     * @memberof ModuleBuilder
     */
    @Inject(ContainerToken)
    protected container: IContainer;

    constructor() {
        super();
    }

    protected createBuilder(): IModuleBuilder<T> {
        return new ModuleBuilder();
    }
}
