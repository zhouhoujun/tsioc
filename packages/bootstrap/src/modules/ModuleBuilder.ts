import 'reflect-metadata';
import {
    IContainer, Token, ProviderTypes, lang, isFunction, isClass,
    isToken, Inject, Registration, Container,
    InjectReference, Injectable, RefTokenType, InjectModuleValidateToken, IModuleValidate
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
    DefaultAnnotationBuilderToken, AnnotationBuilderToken, AnnotationBuilder
} from '../annotations';
import { InjectedModule } from './InjectedModule';
import { DIModuleInjectorToken } from './DIModuleInjector';
import { DIModuleValidateToken } from './DIModuleValidate';

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

    private _bdVaildate: IModuleValidate;
    /**
     * get metadata manager.
     *
     * @param {IContainer} [container]
     * @memberof IModuleBuilder
     */
    getModuleValidate(container: IContainer, token?: Token<any>): IModuleValidate {
        let vaildate: IModuleValidate;
        if (isToken(token)) {
            vaildate = container.getRefService(InjectModuleValidateToken, token) as IModuleValidate;
        }
        if (!vaildate) {
            if (!this._bdVaildate) {
                this._bdVaildate = container.getRefService(InjectModuleValidateToken, lang.getClass(this), this.getDefaultValidateToken());
            }
            vaildate = this._bdVaildate;
        }
        return vaildate;
    }

    protected getDefaultValidateToken(): Token<any> {
        return DIModuleValidateToken;
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
        let bootToken = this.getModuleValidate(container, injmdl.token || injmdl.type).getBootToken(cfg, container);
        let bootInstance;
        if (bootToken) {
            let anBuilder = this.getAnnoBuilder(container, bootToken, cfg.annotationBuilder);
            bootInstance = await anBuilder.build(bootToken, cfg, data);
        } else {
            let mdBuilder = this.getAnnoBuilder(container, injmdl.token, cfg.annotationBuilder);
            bootInstance = (injmdl.token || injmdl.type) ? await mdBuilder.build(injmdl.token || injmdl.type, injmdl.config, data) : mdBuilder.buildByConfig(injmdl.config, data);
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
        let vaildate = this.getModuleValidate(parent, token);
        let mdInjector = parent.resolve(DIModuleInjectorToken, { provide: DIModuleValidateToken, useValue: vaildate });
        let injmdl: InjectedModule<T> = await mdInjector.import(parent, token);
        if (!injmdl) {
            let cfg = vaildate.getMetaConfig(token, parent);
            injmdl = new InjectedModule(token, cfg, parent);
        }
        return injmdl;
    }

    protected async loadViaConfig(config: ModuleConfigure, parent: IContainer): Promise<InjectedModule<T>> {
        let mdInjector = parent.resolve(DIModuleInjectorToken, { provide: DIModuleValidateToken, useValue: this.getModuleValidate(parent) });
        return await mdInjector.importByConfig(parent, config);
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
            let runner: IRunner<T> = container.getRefService(
                [
                    { service: RunnerToken, isPrivate: true },
                    { service: Runner, isPrivate: true },
                    tk => new InjectRunnerToken(tk),
                    tk => new InjectReference(RunnerToken, tk),
                    tk => new InjectReference(Runner, tk)
                ],
                token,
                RunnerToken,
                ...providers);
            let service: IService<T>;
            if (!runner) {
                service = container.getRefService(
                    [
                        { service: ServiceToken, isPrivate: true },
                        { service: Service, isPrivate: true },
                        tk => new InjectServiceToken(tk),
                        tk => new InjectReference(ServiceToken, tk),
                        tk => new InjectReference(Service, tk)
                    ],
                    token,
                    ServiceToken,
                    ...providers);
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
            builder = container.getRefService(
                this.getRefAnnoTokens(container),
                token,
                DefaultAnnotationBuilderToken);
        }

        if (!builder) {
            builder = this.getDefaultAnnBuilder(container);
        }
        if (builder) {
            builder.container = container
        }
        return builder;
    }

    protected getRefAnnoTokens(container: IContainer): RefTokenType<any>[] {
        return [
            { service: AnnotationBuilderToken, isPrivate: true },
            tk => new InjectAnnotationBuilder(tk),
            tk => new InjectReference(AnnotationBuilderToken, tk),
            tk => new InjectReference(AnnotationBuilder, tk)
        ]
    }


    protected getDefaultAnnBuilder(container: IContainer): IAnnotationBuilder<any> {
        return container.resolve(AnnotationBuilderToken);
    }
}
