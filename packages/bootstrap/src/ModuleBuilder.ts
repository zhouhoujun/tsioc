import 'reflect-metadata';
import {
    IContainer, isProviderMap, Provider,
    getTypeMetadata, Token, Type, Providers,
    isString, lang, isFunction, isClass, isUndefined,
    isNull, isBaseObject, isToken, isArray, ContainerBuilderToken,
    hasOwnClassMetadata, IocExt, IContainerBuilder, DefaultContainerBuilder, Singleton, Inject, Registration, isMetadataObject, Container
} from '@ts-ioc/core';
import { IModuleBuilder, ModuleBuilderToken, ModuleEnv, InjectModuleBuilderToken, Runnable } from './IModuleBuilder';
import { ModuleConfigure, ModuleConfig } from './ModuleConfigure';
import { DIModule } from './decorators';
import { BootModule } from './BootModule';
import { MdInstance, LoadedModule } from './ModuleType';
import { IAnnotationBuilder, AnnotationBuilderToken, IAnyTypeBuilder, InjectAnnotationBuilder } from './IAnnotationBuilder';
import { containerPools, ContainerPool } from './ContainerPool';
import { Boot } from './Boot';
import { Service } from './Service';
import { InjectRunnerToken, IRunner } from './IRunner';
import { AnnotationBuilder } from './AnnotationBuilder';


const exportsProvidersFiled = '__exportProviders';

/**
 * inject module load token.
 *
 * @export
 * @class InjectModuleLoadToken
 * @extends {Registration<T>}
 * @template T
 */
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
     * @param {ModuleEnv} [env] set loadedModule will return loaded container; set default container or not. not set will create new container.
     * @param {IContainer} [parent] set the container parent, default will set root default container.
     * @returns {IContainer}
     * @memberof ModuleBuilder
     */
    getContainer(token: Token<T> | ModuleConfigure, env?: ModuleEnv, parent?: IContainer): IContainer {
        let defaultContainer: IContainer;
        if (env instanceof LoadedModule) {
            if (env.token === token) {
                return env.container;
            } else {
                defaultContainer = env.container;
            }
        } else if (defaultContainer instanceof Container) {
            defaultContainer = env;
        }

        let container: IContainer;
        let pools = this.getPools();
        if (isToken(token)) {
            if (pools.has(token)) {
                return pools.get(token);
            } else {
                let cfg = this.getConfigure(token, defaultContainer);
                container = cfg.container || defaultContainer;
                if (!container || !(defaultContainer instanceof Container)) {
                    container = this.isDIModule(token) ? this.createContainer() : pools.getDefault();
                }
                this.setParent(container, parent);
                pools.set(token, container);
                return container;
            }
        } else {
            let id = this.getConfigId(token);
            if (id && pools.has(id)) {
                return pools.get(id);
            }
            container = token.container || defaultContainer;
            if (!container || !(defaultContainer instanceof Container)) {
                container = id ? this.createContainer() : pools.getDefault();
            }
            this.setParent(container, parent);
            if (id || !token.container) {
                pools.set(id, container);
            } else {
                token.container = container;
            }
            return container;
        }
    }

    protected getConfigId(cfg: ModuleConfigure) {
        return cfg.name;
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

    async load(token: Token<T> | ModuleConfigure, env?: ModuleEnv, parent?: IContainer): Promise<LoadedModule> {
        if (env instanceof LoadedModule && env.token === token) {
            return env;
        }

        let container = this.getContainer(token, env, parent);

        let tk = isToken(token) ? token : this.getConfigId(token);
        let mdToken: Token<any> = new InjectModuleLoadToken(tk);
        if (tk && container.has(mdToken)) {
            return container.resolve(mdToken) as LoadedModule;
        }

        let cfg = this.getConfigure(token, container);

        cfg = await this.registerDepdences(container, cfg);

        let loadmdl = {
            token: token,
            moduleToken: isToken(token) ? token : this.getType(cfg),
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
     * @param {ModuleEnv} [env]
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof ModuleBuilder
     */
    async build(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv, data?: any): Promise<T> {
        let loadmdl = await this.load(token, env);
        let container = loadmdl.container;
        let cfg = loadmdl.moduleConfig;
        let builder = this.getBuilder(container, loadmdl.moduleToken, cfg);
        if (builder && builder !== this) {
            return await builder.build(token, container, data);
        } else {
            let annBuilder = this.getAnnoBuilder(container, loadmdl.moduleToken, cfg.annotationBuilder);
            if (!loadmdl.moduleToken) {
                let instance = await annBuilder.buildByConfig(cfg, data);
                return instance;
            } else {
                let instance = await annBuilder.build(loadmdl.moduleToken, cfg, data);
                let mdlInst = instance as MdInstance<T>;
                if (mdlInst && isFunction(mdlInst.mdOnInit)) {
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
    * @param {ModuleEnv} [env]
    * @param {*} [data]
    * @returns {Promise<MdInstance<T>>}
    * @memberof ModuleBuilder
    */
    async bootstrap(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv, data?: any): Promise<Runnable<T>> {
        let loadmdl = await this.load(token, env);
        let cfg = loadmdl.moduleConfig;
        let container = loadmdl.container;
        let builder = this.getBuilder(container, loadmdl.moduleToken, cfg);
        if (builder && builder !== this) {
            return await builder.bootstrap(token, loadmdl, data);
        } else {
            let md = await this.build(token, loadmdl, data) as MdInstance<T>;
            let bootToken = this.getBootType(cfg);
            let anBuilder = this.getAnnoBuilder(container, bootToken, cfg.annotationBuilder);
            let bootInstance = await (bootToken ? anBuilder.build(bootToken, cfg, data) : anBuilder.buildByConfig(cfg, data));
            let runable;
            if (bootInstance) {
                runable = await this.autoRun(container, bootToken, cfg, bootInstance);
                if (md && isFunction(md.mdOnStart)) {
                    await Promise.resolve(md.mdOnStart(bootInstance));
                }
            } else {
                runable = await this.autoRun(container, this.getType(cfg), cfg, md);
            }
            return runable;
        }
    }

    getBuilder(container: IContainer, token: Token<T>, cfg?: ModuleConfigure): IModuleBuilder<T> {
        let builder: IModuleBuilder<T>;
        if (cfg) {
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
        }
        if (!builder && token) {
            container.getTokenExtendsChain(token).forEach(tk => {
                if (builder) {
                    return false;
                }
                let buildToken = new InjectModuleBuilderToken<T>(tk);
                if (container.has(buildToken)) {
                    builder = container.get(buildToken);
                }
                return true;
            });
        }
        return builder || this;
    }

    protected async autoRun(container: IContainer, token: Token<any>, cfg: ModuleConfigure, instance: any): Promise<Runnable<T>> {
        if (!instance) {
            return null;
        }
        let runner: IRunner<T>;
        container.getTokenExtendsChain(token).forEach(tk => {
            if (runner) {
                return false;
            }
            let runnerToken = new InjectRunnerToken<T>(tk);
            if (container.has(runnerToken)) {
                runner = container.resolve(runnerToken, { token: token, instance: instance, config: cfg });
            }
            return true;
        });

        if (runner) {
            await runner.run(instance);
            return runner;
        } else if (instance instanceof Boot || isFunction(instance.run)) {
            await instance.run();
            return instance;
        } else if (instance instanceof Service || (isFunction(instance.start) && isFunction(instance.stop))) {
            await instance.start();
            return instance;
        } else if (token && cfg.autorun) {
            await container.invoke(token, cfg.autorun, instance);
            return instance;
        } else {
            return instance;
        }
    }

    protected getAnnoBuilder(container: IContainer, token: Token<any>, annBuilder: Token<IAnnotationBuilder<any>> | IAnnotationBuilder<any>): IAnyTypeBuilder {
        let builder: IAnnotationBuilder<any>;
        if (isClass(annBuilder)) {
            if (!container.has(annBuilder)) {
                container.register(annBuilder);
            }
        }
        if (isToken(annBuilder)) {
            builder = container.resolve(annBuilder);
        } else if (annBuilder instanceof AnnotationBuilder) {
            builder = annBuilder;
        }
        if (!builder && token) {
            container.getTokenExtendsChain(token).forEach(tk => {
                if (builder) {
                    return false;
                }
                let buildToken = new InjectAnnotationBuilder<T>(tk);
                if (container.has(buildToken)) {
                    builder = container.resolve(buildToken);
                }
                return true;
            });
        }
        if (!builder) {
            builder = this.getDefaultAnnBuilder(container);
        }

        if (builder) {
            builder.container = container
        }
        return builder;
    }


    protected getDefaultAnnBuilder(container: IContainer): IAnnotationBuilder<any> {
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
        } else if (isMetadataObject(token)) {
            cfg = token as ModuleConfigure;
            let type = this.getType(cfg);
            if (type) {
                let typeTask = isClass(type) ? type : (container ? container.getTokenImpl(type) : type);
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

    /**
     * get module type
     *
     * @protected
     * @param {ModuleConfigure} cfg
     * @returns {Token<T>}
     * @memberof ModuleBuilder
     */
    protected getType(cfg: ModuleConfigure): Token<T> {
        return cfg.token || cfg.type;
    }

    /**
     * get boot type.
     *
     * @protected
     * @param {ModuleConfigure} cfg
     * @returns {Token<T>}
     * @memberof ModuleBuilder
     */
    protected getBootType(cfg: ModuleConfigure): Token<T> {
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
        // if (!container.hasRegister(AnnotationBuilder)) {
        //     container.register(AnnotationBuilder);
        // }
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
