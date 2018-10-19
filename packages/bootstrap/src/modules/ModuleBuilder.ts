import 'reflect-metadata';
import {
    IContainer, Token, Providers, lang, isFunction, isClass,
    isToken, Singleton, Inject, Registration, Container, AnnotationMetaAccessorToken
} from '@ts-ioc/core';
import { IModuleBuilder, ModuleBuilderToken, ModuleEnv } from './IModuleBuilder';
import { ModuleConfigure, ModuleConfig } from './ModuleConfigure';
import { MdInstance } from './ModuleType';
import { ContainerPool, ContainerPoolToken } from '../utils';
import { InjectRunnerToken, IRunner, DefaultRunnerToken, Service, IService, InjectServiceToken, DefaultServiceToken, Runnable, Runner } from '../runnable';
import { IAnnotationBuilder, IAnyTypeBuilder, InjectAnnotationBuilder, DefaultAnnotationBuilderToken, AnnotationBuilderToken, AnnotationBuilder } from '../annotations';
import { InjectedModule, InjectedModuleToken } from './InjectedModule';
import { DIModuleInjectorToken } from './DIModuleInjector';

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

    @Inject(ContainerPoolToken)
    protected pools: ContainerPool;

    constructor() {

    }

    getPools(): ContainerPool {
        return this.pools;
    }

    /**
     * build module.
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {ModuleEnv} [env]
     * @param {*} [data] bootstrap data, build data, Runnable data.
     * @returns {Promise<T>}
     * @memberof ModuleBuilder
     */
    async build(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv, data?: any): Promise<T> {
        let injmdl = await this.load(token, env);
        let container = injmdl.container;
        let cfg = injmdl.config;
        let annBuilder = this.getAnnoBuilder(container, injmdl.token, cfg.annotationBuilder);
        if (!injmdl.token) {
            let instance = await annBuilder.buildByConfig(cfg, data);
            return instance;
        } else {
            let instance = await annBuilder.build(injmdl.token, cfg, data);
            let mdlInst = instance as MdInstance<T>;
            if (mdlInst && isFunction(mdlInst.mdOnInit)) {
                mdlInst.mdOnInit(injmdl);
            }
            return instance;
        }
    }

    /**
    * bootstrap module's main.
    *
    * @param {(Token<T> | ModuleConfig<T>)} token
    * @param {ModuleEnv} [env]
    * @param {*} [data] bootstrap data, build data, Runnable data.
    * @returns {Promise<MdInstance<T>>}
    * @memberof ModuleBuilder
    */
    async bootstrap(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv, data?: any): Promise<Runnable<T>> {
        let injmdl = await this.load(token, env);
        let cfg = injmdl.config;
        let container = injmdl.container;
        let md = await this.build(token, injmdl, data) as MdInstance<T>;
        let bootToken = this.getBootType(cfg);
        let anBuilder = this.getAnnoBuilder(container, bootToken, cfg.annotationBuilder);
        let bootInstance = await (bootToken ? anBuilder.build(bootToken, cfg, data) : anBuilder.buildByConfig(cfg, data, this.getType(cfg)));
        let runable;
        if (bootInstance) {
            runable = await this.autoRun(container, bootToken ? bootToken : anBuilder.getType(cfg), cfg, bootInstance, data);
            if (md && isFunction(md.mdOnStart)) {
                await Promise.resolve(md.mdOnStart(bootInstance));
            }
        } else {
            runable = await this.autoRun(container, injmdl.token, cfg, md, data);
        }
        return runable;
    }

    /**
    * run module.
    *
    * @param {(Token<T> | ModuleConfig<T>)} token
    * @param {ModuleEnv} [env]
    * @param {*} [data] bootstrap data, build data, Runnable data.
    * @returns {Promise<MdInstance<T>>}
    * @memberof ModuleBuilder
    */
    run(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv, data?: any): Promise<Runnable<T>> {
        return this.bootstrap(token, env, data);
    }

    async import(token: Token<T>, parent?: IContainer): Promise<InjectedModule<T>> {
        if (!parent) {
            parent = await this.getParentContainer();
        }
        let type = isClass(token) ? token : parent.getTokenImpl(token);
        if (isClass(type)) {
            let key = new InjectedModuleToken(type);
            if (parent.hasRegister(key.toString())) {
                return parent.get(key)
            } else {
                await parent.loadModule(type);
                if (parent.has(key)) {
                    return parent.get(key);
                }
            }
        }
        return null;
    }

    protected async load(token: Token<T> | ModuleConfigure, env?: ModuleEnv): Promise<InjectedModule<T>> {
        if (env instanceof InjectedModule) {
            return env;
        }
        let injmdl: InjectedModule<T> = null;
        let parent = await this.getParentContainer(env);
        if (isToken(token)) {
            injmdl = await this.import(token, parent);
            if (!injmdl) {
                let cfg = parent.get(AnnotationMetaAccessorToken).getMetadata(token, parent);
                injmdl = new InjectedModule(token, cfg, parent);
            }
        } else {
            let mdtype = this.getType(token);
            if (isToken(mdtype)) {
                injmdl = await this.import(mdtype, parent);
                if (injmdl instanceof InjectedModule) {
                    let container = injmdl.container;
                    let injector = container.get(DIModuleInjectorToken);
                    await injector.importByConfig(container, token);
                    injmdl.config = lang.assign(injmdl.config, token);
                }
            } else {
                mdtype = null;
            }
            if (!injmdl) {
                let injector = parent.get(DIModuleInjectorToken);
                await injector.importByConfig(parent, token)
                injmdl = new InjectedModule(mdtype, token, parent);
            }
        }

        return injmdl;
    }


    protected async getParentContainer(env?: ModuleEnv) {
        let parent: IContainer;
        if (env) {
            if (env instanceof Container) {
                parent = env;
            } else if (env instanceof InjectedModule) {
                parent = env.container.parent;
            }
        }
        if (!parent) {
            parent = this.getPools().getDefault();
        }
        return parent;

    }

    protected async autoRun(container: IContainer, token: Token<any>, cfg: ModuleConfigure, instance: any, data: any): Promise<Runnable<T>> {
        if (!instance) {
            return null;
        }

        if (instance instanceof Runner) {
            await instance.run(data);
            return instance;
        } else if (instance instanceof Service) {
            await instance.start(data);
            return instance;
        } else {

            let providers = [{ provide: token, useValue: instance }, { token: token, instance: instance, config: cfg }] as Providers[];
            let runner: IRunner<T> = container.getRefService(InjectRunnerToken, token, DefaultRunnerToken, ...providers);
            let service: IService<T>;
            if (!runner) {
                service = container.getRefService(InjectServiceToken, token, DefaultServiceToken, ...providers);
                if (!service) {
                    runner = this.getDefaultRunner(container, ...providers);
                }
            }
            if (!runner && !service) {
                this.getDefaultService(container, ...providers)
            }
            if (runner) {
                await runner.run(data);
                return runner;
            } else if (service) {
                await service.start(data);
                return service;
            } else if (token && cfg.autorun) {
                await container.invoke(token, cfg.autorun, instance, { data: data });
                return instance;
            } else {
                return instance;
            }
        }
    }

    protected getDefaultRunner(container: IContainer, ...providers: Providers[]): IRunner<T> {
        return null;
    }

    protected getDefaultService(container: IContainer, ...providers: Providers[]): IService<T> {
        return null;
    }

    protected getAnnoBuilder(container: IContainer, token: Token<any>, annBuilder: Token<IAnnotationBuilder<any>> | IAnnotationBuilder<any>): IAnyTypeBuilder {
        let builder: IAnnotationBuilder<any>;
        if (!builder && token) {
            builder = container.getRefService(InjectAnnotationBuilder, token, DefaultAnnotationBuilderToken);
        }

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
}
