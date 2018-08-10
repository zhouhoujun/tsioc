
import {
    IContainer, isProviderMap, Provider,
    getTypeMetadata, Token, Type, Providers,
    isString, lang, isFunction, isClass, isUndefined,
    isNull, isBaseObject, isToken, isArray, ContainerBuilderToken,
    hasOwnClassMetadata, IocExt, IContainerBuilder, DefaultContainerBuilder, Singleton, Inject, Registration
} from '@ts-ioc/core';
import { IModuleBuilder, ModuleBuilderToken } from './IModuleBuilder';
import { ModuleConfigure, ModuleConfig } from './ModuleConfigure';
import { DIModule } from './decorators';
import { BootModule } from './BootModule';
import { MdlInstance, LoadedModule } from './ModuleType';
import { IAnnotationBuilder, AnnotationBuilderToken, IAnyTypeBuilder } from './IAnnotationBuilder';
import { AnnotationBuilder } from './AnnotationBuilder';
import { containerPools, ContainerPool } from './ContainerPool';


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

    protected pools;
    getPools(): ContainerPool {
        if (!this.pools) {
            this.pools = containerPools;
        }
        if (!this.pools.hasDefault()) {
            this.regDefaultContainer();
        }
        return this.pools;
    }
    setPools(pools: ContainerPool) {
        this.pools = pools;
    }

    protected regDefaultContainer(): IContainer {
        let container = this.createContainer();
        container.register(BootModule);
        this.pools.setDefault(container);
        return container;
    }

    /**
     * get container of the module.
     *
     * @param {(ModuleType | ModuleConfigure)} token module type or module configuration.
     * @param {IContainer} [defaultContainer] set default container or not. not set will create new container.
     * @param {IContainer} [parent] set the container parent, default will set root default container.
     * @returns {IContainer}
     * @memberof ModuleBuilder
     */
    getContainer(token: Token<T> | ModuleConfigure, defaultContainer?: IContainer, parent?: IContainer): IContainer {
        let container: IContainer;
        let pools = this.getPools();
        if (isToken(token)) {
            if (pools.has(token)) {
                return pools.get(token);
            } else {
                let cfg = this.getConfigure(token, defaultContainer);

                container = cfg.container || defaultContainer;

                if (!container) {
                    container = this.isDIModule(token) ? this.createContainer() : pools.getDefault();
                }
                this.setParent(container, parent);

                pools.set(token, container);
                return container;
            }
        } else {
            if (token.name && pools.has(token.name)) {
                return pools.get(token.name);
            }
            if (token.container) {
                container = token.container;
            } else {
                container = token.container = defaultContainer || pools.getDefault();
            }
            if (token.name) {
                pools.set(token.name, container);
            }
            this.setParent(container, parent);

            return container;
        }
    }

    protected setParent(container: IContainer, parent?: IContainer) {
        let pools = this.getPools();
        if (pools.isDefault(container)) {
            return;
        }
        if (!container.parent) {
            if (parent && parent !== container) {
                container.parent = parent;
            } else {
                container.parent = pools.getDefault();
            }
        }
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

    async load(token: Token<T> | ModuleConfigure, defaultContainer?: IContainer, parent?: IContainer): Promise<LoadedModule> {
        let container = this.getContainer(token, defaultContainer, parent);

        let tk = isToken(token) ? token : token.name;
        let mdToken: Token<any> = new InjectModuleLoadToken(tk);
        if (isToken(mdToken) && container.has(mdToken)) {
            return container.resolve(mdToken) as LoadedModule;
        }

        let cfg = this.getConfigure(token, container);

        cfg = await this.registerDepdences(container, cfg);

        let loadmdl = {
            moduleToken: isToken(token) ? token : null,
            container: container,
            moduleConfig: cfg
        } as LoadedModule;

        if (tk) {
            container.bindProvider(mdToken, () => loadmdl);
        }

        return loadmdl;
    }

    /**
     * build module.
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {(IContainer | LoadedModule)} [defaults]
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof ModuleBuilder
     */
    async build(token: Token<T> | ModuleConfig<T>, defaults?: IContainer | LoadedModule, data?: any): Promise<T> {
        let loadmdl = await this.loadByDefaults(token, defaults);
        let container = loadmdl.container;
        let cfg = loadmdl.moduleConfig;
        let builder = this.getBuilder(container, cfg);
        if (builder && builder !== this) {
            return await builder.build(token, container, data);
        } else {
            let boot: Token<T> = loadmdl.moduleToken;
            if (!boot) {
                let bootBuilder = this.getTypeBuilder(container, cfg.annotationBuilder);
                let instance = await bootBuilder.buildByConfig(cfg, data);
                return instance;
            } else {
                let bootbuilder = this.getTypeBuilder(container, cfg.annotationBuilder);
                let instance = await bootbuilder.build(boot, cfg, data);
                let mdlInst = instance as MdlInstance<T>;
                if (isFunction(mdlInst.mdOnInit)) {
                    mdlInst.mdOnInit(loadmdl);
                }
                return instance;
            }
        }
    }

    /**
    * bootstrap module's main.
    *
    * @param {(Token<T> | ModuleConfig<T>)} token
    * @param {(IContainer | LoadedModule)} [defaults]
    * @param {*} [data]
    * @returns {Promise<MdlInstance<T>>}
    * @memberof ModuleBuilder
    */
    async bootstrap(token: Token<T> | ModuleConfig<T>, defaults?: IContainer | LoadedModule, data?: any): Promise<any> {
        let loadmdl = await this.loadByDefaults(token, defaults);
        let cfg = loadmdl.moduleConfig;
        let builder = this.getBuilder(loadmdl.container, cfg);
        if (builder && builder !== this) {
            return await builder.bootstrap(token, loadmdl, data);
        } else {
            let md = await this.build(token, loadmdl, data) as MdlInstance<T>;
            let bootInstance;
            if (loadmdl.moduleToken) {
                if (md && isFunction(md.anBeforeCreate)) {
                    md.anBeforeCreate(loadmdl);
                }

                let builder = this.getTypeBuilder(loadmdl.container, cfg.annotationBuilder);
                bootInstance = await builder.buildByConfig(cfg, data);

                if (isFunction(md.anAfterCreate)) {
                    md.anAfterCreate(bootInstance);
                }
                if (isFunction(md.mdOnStart)) {
                    await Promise.resolve(md.mdOnStart(bootInstance));
                }

                if (isFunction(md.mdOnStarted)) {
                    md.mdOnStarted(bootInstance);
                }
            } else {
                bootInstance = md;
            }

            return bootInstance;
        }
    }

    protected async loadByDefaults(token: Token<T> | ModuleConfig<T>, defaults?: IContainer | LoadedModule): Promise<LoadedModule> {
        let loadmdl: LoadedModule;
        if (defaults instanceof LoadedModule) {
            loadmdl = defaults;
        } else {
            loadmdl = await this.load(token, defaults);
        }
        return loadmdl;
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


    protected getTypeBuilder(container: IContainer, typeBuilder: Token<IAnnotationBuilder<any>> | IAnnotationBuilder<any>): IAnyTypeBuilder {
        let builder: IAnnotationBuilder<any>;
        if (isClass(typeBuilder)) {
            if (!container.has(typeBuilder)) {
                container.register(typeBuilder);
            }
        }
        if (isToken(typeBuilder)) {
            builder = container.resolve(typeBuilder);
        } else if (typeBuilder instanceof AnnotationBuilder) {
            builder = typeBuilder;
        }
        if (!builder) {
            builder = this.getDefaultTypeBuilder(container);
        }

        return builder;
    }

    protected getDefaultTypeBuilder(container: IContainer): IAnnotationBuilder<any> {
        return container.resolve(AnnotationBuilderToken);
    }


    async importModule(token: Token<T> | ModuleConfigure, container: IContainer): Promise<IContainer> {
        if (container && isClass(token) && !this.isDIModule(token)) {
            container.register(token);
            return container;
        }
        let imp = await this.load(token, null, container);
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

    protected getBootstrapToken(cfg: ModuleConfigure): Token<T> {
        return cfg.bootstrap;
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

    protected isDIModule(token: Token<any>) {
        if (!isClass(token)) {
            return false;
        }
        if (hasOwnClassMetadata(this.getDecorator(), token)) {
            return true;
        }
        return hasOwnClassMetadata(DIModule, token);
    }

    protected async registerExts(container: IContainer, config: ModuleConfigure): Promise<IContainer> {
        // register for each container.
        if (!container.hasRegister(AnnotationBuilder)) {
            container.register(AnnotationBuilder);
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
