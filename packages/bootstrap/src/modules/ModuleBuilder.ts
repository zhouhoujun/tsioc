import 'reflect-metadata';
import {
    IContainer, Token, ProviderTypes, lang, isFunction,
    isClass, isToken, Inject, Registration, Container,
    Injectable, MetaAccessorToken, IMetaAccessor,
    InjectMetaAccessorToken, isArray, ProviderParserToken
} from '@ts-ioc/core';
import { IModuleBuilder, ModuleBuilderToken, ModuleEnv } from './IModuleBuilder';
import { ModuleConfigure, ModuleConfig } from './ModuleConfigure';
import { MdInstance } from './ModuleType';
import { ContainerPool, ContainerPoolToken } from '../utils';
import {
    InjectRunnerToken, IRunner, RunnerToken, Service, IService,
    InjectServiceToken, ServiceToken, Runnable, Runner
} from '../runnable';
import {
    IAnnotationBuilder, IAnyTypeBuilder, InjectAnnotationBuilder,
    AnnotationBuilderToken, AnnotationBuilder
} from '../annotations';
import { InjectedModule, InjectedModuleToken } from './InjectedModule';

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
@Injectable(ModuleBuilderToken)
export class ModuleBuilder<T> implements IModuleBuilder<T> {

    @Inject(ContainerPoolToken)
    protected pools: ContainerPool;

    constructor() {

    }

    getPools(): ContainerPool {
        return this.pools;
    }

    /**
     * get metadata accessor.
     *
     * @param {IContainer} container
     * @param {Token<any>} token
     * @param {ModuleConfigure} [config]
     * @returns {IMetaAccessor<any>}
     * @memberof ModuleBuilder
     */
    getMetaAccessor(container: IContainer, token: Token<any>, config?: ModuleConfigure): IMetaAccessor<any> {
        return container.getService(MetaAccessorToken,
            isToken(token) ? [token, lang.getClass(this)] : lang.getClass(this),
            tk => new InjectMetaAccessorToken(tk), config ? (config.defaultMetaAccessor || MetaAccessorToken) : MetaAccessorToken);
    }

    /**
     * load module.
     *
     * @param {(Token<T> | ModuleConfigure)} token
     * @param {ModuleEnv} [env]
     * @returns {Promise<InjectedModule<T>>}
     * @memberof ModuleBuilder
     */
    async load(token: Token<T> | ModuleConfigure, env?: ModuleEnv): Promise<InjectedModule<T>> {
        if (env instanceof InjectedModule) {
            return env;
        }
        let parent = await this.getParentContainer(env);
        if (isToken(token)) {
            return await this.loadViaToken(token, parent);
        } else {
            return await this.loadViaConfig(token, parent);
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
        let bootInstance = await this.createInstance(injmdl) as MdInstance<T>;

        let runable;
        if (bootInstance) {
            if (isFunction(bootInstance.mdOnInit)) {
                await Promise.resolve(bootInstance.mdOnInit(injmdl));
            }
            runable = await this.autoRun(container, lang.getClass(bootInstance), cfg, bootInstance, data);
            if (isFunction(bootInstance.mdOnStart)) {
                await Promise.resolve(bootInstance.mdOnStart(bootInstance));
            }
        }
        return runable;
    }

    async createInstance(injmdl: InjectedModule<T>, data?: any): Promise<T> {
        let cfg = injmdl.config;
        let container = injmdl.container;
        let accessor = this.getMetaAccessor(container, injmdl.token || injmdl.type);
        let bootToken = accessor.getBootToken(cfg, container);
        let bootInstance;
        if (bootToken) {
            let anBuilder = this.getAnnoBuilder(container, bootToken, cfg);
            bootInstance = await anBuilder.build(bootToken, cfg, data);
        } else {
            let mdBuilder = this.getAnnoBuilder(container, injmdl.token || injmdl.type, cfg);
            if (injmdl.token || injmdl.type) {
                bootInstance = await mdBuilder.build(injmdl.token || injmdl.type, injmdl.config, data);
            } else {
                bootInstance = await mdBuilder.buildByConfig(injmdl.config, data);
            }
        }
        return bootInstance;
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

    protected async loadViaToken(token: Token<T>, parent: IContainer): Promise<InjectedModule<T>> {
        let injmdl = await this.import(token, parent);
        if (!injmdl) {
            let cfg = this.getMetaAccessor(parent, token).getMetadata(token, parent);
            injmdl = new InjectedModule(token, cfg, parent);
        }
        return injmdl;
    }

    protected async loadViaConfig(config: ModuleConfigure, parent: IContainer): Promise<InjectedModule<T>> {
        let injmd: InjectedModule<T> = null;
        let token = this.getMetaAccessor(parent, null, config).getToken(config, parent);
        if (token) {
            injmd = await this.import(token, parent);
            if (!injmd) {
                let cfg = this.getMetaAccessor(parent, token).getMetadata(token, parent, config);
                injmd = new InjectedModule(token, cfg, parent);
            }
        } else {
            token = null;
        }
        if (isArray(config.imports) && config.imports.length) {
            await parent.loadModule(...config.imports);
        }
        if (isArray(config.providers) && config.providers.length) {
            let parser = parent.get(ProviderParserToken);
            let pdrmap = parser.parse(...config.providers);
            pdrmap.keys().forEach(key => {
                parent.bindProvider(key, (...providers: ProviderTypes[]) => pdrmap.resolve(key, ...providers));
            });
        }
        if (injmd) {
            injmd.config = lang.assign({}, injmd.config, config);
        } else {
            injmd = new InjectedModule(token, config, parent);
        }

        return injmd;
    }

    protected async import(token: Token<T>, parent: IContainer): Promise<InjectedModule<T>> {
        let type = isClass(token) ? token : parent.getTokenImpl(token);
        if (isClass(type)) {
            let key = new InjectedModuleToken(type);
            if (parent.has(key)) {
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
            let providers = [{ provide: token, useValue: instance }, { token: token, instance: instance, config: cfg }] as ProviderTypes[];
            let runner: IRunner<T> = container.getService(RunnerToken, token, tk => new InjectRunnerToken(tk), ...providers);
            let service: IService<T>;
            if (!runner) {
                service = container.getService(ServiceToken, token, tk => new InjectServiceToken(tk), ...providers);
            }
            if (runner) {
                await runner.run(data);
                return runner;
            } else if (service) {
                await service.start(data);
                return service;
            } else {
                return null;
            }
        }
    }

    protected getAnnoBuilder(container: IContainer, token: Token<any>, config: ModuleConfigure): IAnyTypeBuilder {
        let builder: IAnnotationBuilder<any>;
        if (isClass(config.annoBuilder)) {
            if (!container.has(config.annoBuilder)) {
                container.register(config.annoBuilder);
            }
        }

        if (isToken(config.annoBuilder)) {
            builder = container.resolve(config.annoBuilder);
        } else if (config.annoBuilder instanceof AnnotationBuilder) {
            builder = config.annoBuilder;
        }

        if (!builder && token) {
            builder = container.getService(AnnotationBuilderToken, token, tk => new InjectAnnotationBuilder(tk),
                config.defaultAnnoBuilder || AnnotationBuilderToken);
        }

        if (builder) {
            builder.container = container
        }
        return builder;
    }
}
