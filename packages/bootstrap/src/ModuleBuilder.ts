
import {
    IContainer, isProviderMap, Provider,
    getTypeMetadata, Token, Type, Providers,
    isString, lang, isFunction, isClass, isUndefined,
    isNull, isBaseObject, isToken, isArray, ContainerBuilderToken,
    hasOwnClassMetadata, IocExt, IContainerBuilder, DefaultContainerBuilder, Singleton, Inject, Injectable, Registration
} from '@ts-ioc/core';
import { IModuleBuilder, ModuleBuilderToken } from './IModuleBuilder';
import { ModuleConfigure } from './ModuleConfiguration';
import { DIModule } from './decorators';
import { BootModule } from './BootModule';
import { MdlInstance, DIModuleType, LoadedModule } from './ModuleType';
import { IBootstrapBuilder, BootstrapBuilderToken } from './IBootstrapBuilder';
import { BootstrapBuilder } from './BootstrapBuilder';


const exportsProvidersFiled = '__exportProviders';


export class InjectModuleLoadToken<T> extends Registration<T> {

    constructor(token: Token<T>) {
        super(token, 'module_loader')
    }
}

/**
 * module builder
 *
 * @export
 * @class ModuleBuilder
 * @implements {IModuleBuilder}
 * @template T
 */
@Singleton(ModuleBuilderToken)
export class ModuleBuilder<T> implements IModuleBuilder<T> {

    constructor() {

    }

    /**
     * get container of the module.
     *
     * @param {(ModuleType | ModuleConfigure)} token module type or module configuration.
     * @param {IContainer} [defaultContainer] set default container or not. not set will create new container.
     * @returns {IContainer}
     * @memberof ModuleBuilder
     */
    getContainer(token: Token<T> | ModuleConfigure, defaultContainer?: IContainer): IContainer {
        let container: IContainer;
        if (isToken(token)) {
            if (isClass(token)) {
                let mdToken = token as DIModuleType<T>;
                if (mdToken.__di) {
                    return mdToken.__di;
                } else {
                    let cfg = this.getConfigure(mdToken);
                    if (cfg.container) {
                        mdToken.__di = cfg.container;
                    } else {
                        mdToken.__di = defaultContainer || this.createContainer();
                    }
                    container = mdToken.__di;
                }
            } else {
                return defaultContainer || this.createContainer();
            }
        } else {
            if (token.container) {
                container = token.container;
            } else {
                container = token.container = defaultContainer || this.createContainer();
            }
        }
        return container;
    }

    createContainer(): IContainer {
        return this.getContainerBuilder().create();
    }

    @Inject(ContainerBuilderToken)
    protected containerBuilder: IContainerBuilder;
    getContainerBuilder() {
        if (!this.containerBuilder) {
            this.containerBuilder = this.createContainerBuilder();
        }
        return this.containerBuilder;
    }

    protected createContainerBuilder(): IContainerBuilder {
        return new DefaultContainerBuilder();
    }

    async load(token: Token<T> | ModuleConfigure, defaultContainer?: IContainer): Promise<LoadedModule> {
        let container = this.getContainer(token, defaultContainer);

        let tk = isToken(token) ? token : token.name;
        let mdToken: Token<any> = new InjectModuleLoadToken(tk);
        if (isToken(mdToken) && container.has(mdToken)) {
            return container.resolve(mdToken) as LoadedModule;
        }

        let cfg = this.getConfigure(token, container);

        cfg = await this.registerDepdences(container, cfg);
        let boot = this.getBootstrapToken(cfg, mdToken);

        let loadmdl = {
            moduleToken: isToken(token) ? token : cfg.bootstrap,
            container: container,
            moduleConfig: cfg
        } as LoadedModule;

        if (isClass(boot)) {
            if (!container.has(boot)) {
                container.register(boot);
            }
        }

        if (tk) {
            container.bindProvider(mdToken, () => loadmdl);
        }

        return loadmdl;
    }

    /**
     * build module.
     *
     * @param {(Token<T> | ModuleConfigure)} token
     * @param {(IContainer | LoadedModule)} [defaults]
     * @returns {Promise<T>}
     * @memberof ModuleBuilder
     */
    async build(token: Token<T> | ModuleConfigure, defaults?: IContainer | LoadedModule): Promise<T> {
        let loadmdl: LoadedModule;
        if (defaults instanceof LoadedModule) {
            loadmdl = defaults
        } else {
            loadmdl = await this.load(token, defaults);
        }

        let container = loadmdl.container;
        let cfg = loadmdl.moduleConfig;
        let builder = this.getBuilder(container, cfg);
        if (builder && builder !== this) {
            return await builder.build(token, container);
        }

        let boot = this.getBootstrapToken(cfg, loadmdl.moduleToken);

        let instance = this.createModuleInstance(boot, container);

        let mdlInst = instance as MdlInstance<T>;
        if (isFunction(mdlInst.mdOnInit)) {
            mdlInst.mdOnInit(loadmdl);
        }
        instance = await this.buildStrategy(instance, cfg);
        return instance;
    }

    protected createModuleInstance(token: Token<T>, container: IContainer): T {
        let loadmdl: T;
        if (!token || isString(token)) {
            loadmdl = container.resolve(token) as T
        } else {
            if (isClass(token) && !container.has(token)) {
                container.register(token);
            }
            loadmdl = container.resolve(token) as T;
        }
        return loadmdl;
    }

    /**
     * bundle instance via config.
     *
     * @param {T} instance
     * @param {ModuleConfiguration<T>} config
     * @param {IContainer} [container]
     * @returns {Promise<T>}
     * @memberof BootstrapBuilder
     */
    async buildStrategy(instance: T, config: ModuleConfigure): Promise<T> {
        return instance;
    }

    protected getBuilder(container: IContainer, cfg: ModuleConfigure): IModuleBuilder<T> {
        let builder: IModuleBuilder<T>;
        if (isClass(cfg.builder)) {
            if (!container.has(cfg.builder)) {
                container.register(cfg.builder);
            }
        }
        if (isToken(cfg.builder)) {
            builder = container.resolve(cfg.builder);
        } else if (cfg.builder instanceof ModuleBuilder) {
            builder = cfg.builder;
        }
        return builder;
    }

    /**
     * bootstrap module's main.
     *
     * @param {(Token<T> | ModuleConfigure)} token
     * @param {*} [data]
     * @param {IContainer} [defaultContainer]
     * @returns {Promise<MdlInstance<T>>}
     * @memberof ModuleBuilder
     */
    async bootstrap(token: Token<T> | ModuleConfigure, data?: any, defaultContainer?: IContainer): Promise<T> {
        let iocMd = await this.load(token, defaultContainer);
        let md = await this.build(token, iocMd) as MdlInstance<T>;
        if (isFunction(md.btBeforeCreate)) {
            md.btBeforeCreate(iocMd);
        }
        let instance = await this.createBootstrap(iocMd.container, iocMd.moduleConfig, data);
        if (isFunction(md.btAfterCreate)) {
            md.btAfterCreate(instance);
        }
        if (isFunction(md.mdOnStart)) {
            await Promise.resolve(md.mdOnStart(instance));
        }

        if (isFunction(md.mdOnStarted)) {
            md.mdOnStarted(instance);
        }
        return md;
    }


    protected async createBootstrap(container: IContainer, config: ModuleConfigure, data?: any): Promise<any> {
        let bootBuilder = this.getBootstrapBuilder(container, config);
        let bootstrap = bootBuilder.getBootstrapToken(config);
        if (bootstrap) {
            return await bootBuilder.build(config, data);
        } else {
            return null;
        }
    }

    protected getBootstrapBuilder(container: IContainer, config: ModuleConfigure): IBootstrapBuilder<any> {
        let builder: IBootstrapBuilder<any>;
        if (isClass(config.bootBuilder)) {
            if (!container.has(config.bootBuilder)) {
                container.register(config.bootBuilder);
            }
        }
        if (isToken(config.bootBuilder)) {
            builder = container.resolve(config.bootBuilder);
        } else if (config.bootBuilder instanceof BootstrapBuilder) {
            builder = config.bootBuilder;
        }
        if (!builder) {
            builder = container.resolve(BootstrapBuilderToken);
        }

        return builder;
    }


    async importModule(token: Token<T> | ModuleConfigure, container: IContainer): Promise<IContainer> {
        if (container && isClass(token) && !this.isDIModule(token)) {
            container.register(token);
            return container;
        }
        let imp = await this.load(token);
        if (!container.has(imp.moduleToken)) {
            await this.importConfigExports(container, imp.container, imp.moduleConfig);
            imp.container.parent = container;
            if (imp.moduleToken) {
                container.bindProvider(imp.moduleToken, imp);
            }
        }
        return container;
    }

    getDecorator() {
        return DIModule.toString();
    }

    /**
     * get configuration.
     *
     * @returns {ModuleConfigure}
     * @memberof ModuleBuilder
     */
    getConfigure(token?: Token<T> | ModuleConfigure, container?: IContainer): ModuleConfigure {
        let cfg: ModuleConfigure;
        if (isClass(token)) {
            cfg = this.getMetaConfig(token);
        } else if (isToken(token)) {
            let tokenType = container ? container.getTokenImpl(token) : token;
            if (isClass(tokenType)) {
                cfg = this.getMetaConfig(tokenType);
            }
        } else {
            cfg = token as ModuleConfigure;
            let bootToken = this.getBootstrapToken(cfg);
            if (bootToken) {
                let typeTask = isClass(bootToken) ? bootToken : (container ? container.getTokenImpl(bootToken) : bootToken);
                if (isClass(typeTask)) {
                    cfg = lang.assign({}, this.getMetaConfig(typeTask), cfg || {});
                }
            }
        }
        return cfg || {};
    }

    async registerDepdences(container: IContainer, config: ModuleConfigure): Promise<ModuleConfigure> {
        await this.registerExts(container, config);
        config = await this.registerConfgureDepds(container, config);
        return config;
    }

    protected getBootstrapToken(cfg: ModuleConfigure, token?: Token<any>): Token<any> {
        return token || cfg.bootstrap;
    }

    protected async importConfigExports(container: IContainer, providerContainer: IContainer, cfg: ModuleConfigure) {
        if (cfg.exports && cfg.exports.length) {
            await Promise.all(cfg.exports.map(async tk => {
                container.bindProvider(tk, (...providers: Providers[]) => providerContainer.resolve(tk, ...providers));
                return tk;
            }));
        }
        let expProviders: Token<any>[] = cfg[exportsProvidersFiled];
        if (expProviders && expProviders.length) {
            expProviders.forEach(tk => {
                container.bindProvider(tk, () => providerContainer.get(tk));
            })
        }
        return container;
    }

    protected async registerConfgureDepds(container: IContainer, config: ModuleConfigure): Promise<ModuleConfigure> {
        if (isArray(config.imports) && config.imports.length) {
            let buider = container.get(ContainerBuilderToken);
            let mdls = await buider.loader.loadTypes(config.imports, it => this.isIocExt(it) || this.isDIModule(it));
            await Promise.all(mdls.map(md => this.importModule(md, container)));
        }

        if (isArray(config.providers) && config.providers.length) {
            config[exportsProvidersFiled] = this.bindProvider(container, config.providers);
        }

        return config;
    }

    protected getMetaConfig(bootModule: Type<any>): ModuleConfigure {
        let decorator = this.getDecorator();
        if (this.isDIModule(bootModule)) {
            let metas = getTypeMetadata<ModuleConfigure>(decorator, bootModule);
            if (metas && metas.length) {
                let meta = metas[0];
                // meta.bootstrap = meta.bootstrap || bootModule;
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

    protected async registerExts(container: IContainer, config: ModuleConfigure): Promise<IContainer> {
        if (!container.has(BootModule)) {
            container.register(BootModule);
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
