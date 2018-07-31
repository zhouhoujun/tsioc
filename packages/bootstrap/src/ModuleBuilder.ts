
import {
    IContainer, isProviderMap, Provider,
    getTypeMetadata, Token, Type, Providers,
    isString, lang, isFunction, isClass, isUndefined,
    isNull, isBaseObject, isToken, isArray, ContainerBuilderToken,
    hasOwnClassMetadata, IocExt, IContainerBuilder, DefaultContainerBuilder, Singleton, Inject
} from '@ts-ioc/core';
import { IModuleBuilder, ModuleBuilderToken } from './IModuleBuilder';
import { ModuleConfigure } from './ModuleConfiguration';
import { DIModule } from './decorators';
import { BootModule } from './BootModule';
import { ModuleType, IocModule, MdlInstance, DIModuleType } from './ModuleType';
import { IBootstrapBuilder, BootstrapBuilderToken } from './IBootstrapBuilder';
import { BootstrapBuilder } from './BootstrapBuilder';


const exportsProvidersFiled = '__exportProviders';

/**
 * module builder
 *
 * @export
 * @class ModuleBuilder
 * @implements {IModuleBuilder}
 * @template T
 */
@Singleton(ModuleBuilderToken)
export class ModuleBuilder implements IModuleBuilder {

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
    getContainer(token: ModuleType | ModuleConfigure, defaultContainer?: IContainer): IContainer {
        let container: IContainer;
        if (isClass(token)) {
            if (token.__di) {
                return token.__di;
            } else {
                let cfg = this.getConfigure(token);
                if (cfg.container) {
                    token.__di = cfg.container;
                } else {
                    token.__di = defaultContainer || this.createContainer();
                }
                container = token.__di;
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

    /**
     * build module.
     *
     * @param {(DIModuleType<TM> | ModuleConfigure)} [token]
     * @returns {Promise<MdlInstance<TM>>}
     * @memberof ModuleBuilder
     */
    async build<TM>(token: DIModuleType<TM> | ModuleConfigure, defaultContainer?: IContainer): Promise<MdlInstance<TM>> {
        let container = this.getContainer(token, defaultContainer);

        let mdToken: Token<any> = isToken(token) ? token : token.name;
        if (isToken(mdToken) && container.has(mdToken)) {
            return container.resolve(mdToken);
        }

        let cfg = this.getConfigure(token, container);

        cfg = await this.registerDepdences(container, cfg);
        let boot = this.getBootstrapToken(cfg, mdToken);
        let iocModule = this.createModuleInstance(mdToken, container);

        iocModule.bootstrap = boot;
        iocModule.container = container;
        if (!iocModule.bootBuilder) {
            iocModule.bootBuilder = this.getBootstrapBuilder(container, cfg);
        }
        iocModule.moduleConfig = cfg;

        if (isClass(boot)) {
            if (!container.has(boot)) {
                container.register(boot);
            }
        }

        if (isToken(mdToken)) {
            iocModule.moduleToken = mdToken;
            container.bindProvider(mdToken, iocModule);
        }

        if (isFunction(iocModule.mdOnLoaded)) {
            iocModule.mdOnLoaded(iocModule);
        }

        return iocModule;
    }

    protected createModuleInstance(token: Token<any>, container: IContainer): MdlInstance<any> {
        let iocModule: MdlInstance<any>;
        if (!token || isString(token)) {
            iocModule = container.resolve(token) as MdlInstance<any>;
        } else {
            if (isClass(token) && !container.has(token)) {
                container.register(token);
            }
            iocModule = container.resolve(token) as MdlInstance<any>;
        }
        return iocModule;
    }

    protected getBootstrapBuilder(container: IContainer, cfg: ModuleConfigure) {
        let bootstrapBuilder: IBootstrapBuilder;
        if (isClass(cfg.bootBuilder)) {
            if (!container.has(cfg.bootBuilder)) {
                container.register(cfg.bootBuilder);
            }
        }
        if (isToken(cfg.bootBuilder)) {
            bootstrapBuilder = container.resolve(cfg.bootBuilder);
        } else if (cfg.bootBuilder instanceof BootstrapBuilder) {
            bootstrapBuilder = cfg.bootBuilder;
        }

        return bootstrapBuilder;
    }

    /**
     * bootstrap module.
     *
     * @param {(DIModuleType<TM> | ModuleConfigure)} token
     * @param {IContainer} [defaultContainer]
     * @memberof ModuleBuilder
     */
    async bootstrap<TM>(token: DIModuleType<TM> | ModuleConfigure, defaultContainer?: IContainer): Promise<MdlInstance<TM>> {
        let md = await this.build<TM>(token, defaultContainer);
        if (isFunction(md.mdBeforeCreate)) {
            md.mdBeforeCreate(md);
        }
        let instance = await this.createBootstrap(md);
        if (isFunction(md.mdAfterCreate)) {
            md.mdAfterCreate(instance);
        }
        if (isFunction(md.mdOnStart)) {
            await Promise.resolve(md.mdOnStart(instance));
        }

        if (isFunction(md.mdOnStarted)) {
            md.mdOnStarted(instance);
        }
        return md;
    }

    protected async createBootstrap(iocModule: IocModule<any>): Promise<any> {
        let bootBuilder = iocModule.bootBuilder || iocModule.container.resolve(BootstrapBuilderToken);
        return await bootBuilder.build(iocModule);
    }


    async importModule(token: ModuleType | ModuleConfigure, container: IContainer): Promise<IContainer> {
        if (container && isClass(token) && !this.isDIModule(token)) {
            container.register(token);
            return container;
        }
        let imp = await this.build(token);
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
    getConfigure(token?: ModuleType | ModuleConfigure, container?: IContainer): ModuleConfigure {
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
