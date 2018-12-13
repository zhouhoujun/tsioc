import {
    Token, isToken, IContainer, isClass, Inject, ContainerToken,
    lang, isFunction, Injectable, Container, IMetaAccessor, ParamProviders,
    InjectMetaAccessorToken, MetaAccessorToken
} from '@ts-ioc/core';
import { IAnnotationBuilder, AnnotationBuilderToken, AnnotationConfigure, InjectAnnotationBuilder } from './IAnnotationBuilder';
import {
    Runnable, Runner, Service, RunnerToken, IRunner, IService,
    ServiceToken, InjectServiceToken, InjectRunnerToken
} from '../runnable';
import { AnnoTokenVaild, BootHooks, AnnoBuildCompleted } from './AnnoType';

/**
 * Annotation class builder. build class with metadata and config.
 *
 * @export
 * @class AnnotationBuilder
 * @implements {implements IAnnotationBuilder<T>}
 * @template T
 */
@Injectable(AnnotationBuilderToken)
export class AnnotationBuilder<T> implements IAnnotationBuilder<T> {
    /**
     * ioc container.
     *
     * @type {IContainer}
     * @memberof BootBuilder
     */
    @Inject(ContainerToken)
    public container: IContainer;

    constructor() {

    }

    /**
     * get metadata accessor.
     *
     * @param {Token<any>} token
     * @param {AnnotationConfigure<T>} [config]
     * @returns {IMetaAccessor<any>}
     * @memberof AnnotationBuilder
     */
    getMetaAccessor(token: Token<any>, config?: AnnotationConfigure<T>): IMetaAccessor<any> {
        return this.container.getService(MetaAccessorToken,
            isToken(token) ? [token, lang.getClass(this)] : lang.getClass(this),
            tk => new InjectMetaAccessorToken(tk), config ? (config.defaultMetaAccessor || MetaAccessorToken) : MetaAccessorToken);
    }


    /**
     * build token type via config.
     *
     * @param {Token<T>} token
     * @param {AnnotationConfigure<T>} [config]
     * @param {*} [data] build data
     * @returns {Promise<T>}
     * @memberof AnnotationBuilder
     */
    async build(token: Token<T>, config?: AnnotationConfigure<T>, data?: any, completed?: AnnoBuildCompleted<T>): Promise<T> {
        if (isClass(token) && !this.container.hasRegister(token)) {
            this.container.register(token);
        }

        config = this.getMetaAccessor(token, config).getMetadata(token, this.container, config);
        let builder = this.getBuilder(token, config);
        if (!this.isEqual(builder)) {
            return await builder.build(token, config, data, completed);
        } else {
            await this.registerExts(config);
            let instance = await this.createInstance(token, config, data) as BootHooks<T>;
            if (!instance) {
                return null;
            }
            if (isFunction(instance.anBeforeInit)) {
                await Promise.resolve(instance.anBeforeInit(config));
            }
            instance = await this.buildStrategy(instance, config, data) as BootHooks<T>;
            if (isFunction(instance.anAfterInit)) {
                await Promise.resolve(instance.anAfterInit(config));
            }
            if (isFunction(completed)) {
                completed(config, instance, this);
            }
            return instance;
        }
    }

    /**
     * build instance via type config.
     *
     * @param {(Token<T> | AnnotationConfigure<T>)} config
     * @param {*} [data] build data.
     * @param {AnnoTokenVaild} [vaild]
     * @returns {Promise<T>}
     * @memberof IAnnotationBuilder
     */
    async buildByConfig(config: Token<T> | AnnotationConfigure<T>, data?: any, vaild?: AnnoTokenVaild<T>): Promise<T> {
        let token: Token<T>;
        if (isToken(config)) {
            token = config;
            if (vaild && !vaild(token)) {
                token = null;
            }
            return await this.build(token, null, data);
        } else {
            token = this.getMetaAccessor(null, config).getToken(config, this.container);
            if (vaild && !vaild(token)) {
                token = null;
            }
            return await this.build(token, config, data);
        }
    }

    /**
     * run runable.
     *
     * @param {(Token<T> | AnnotationConfigure<T>)} runable
     * @param {*} [data] bootstrap data, build data, Runnable data.
     * @returns {Promise<Runnable<T>>}
     * @memberof IGModuleBuilder
     */
    async boot(runable: Token<T> | AnnotationConfigure<T>, config?: AnnotationConfigure<T>, data?: any): Promise<Runnable<T>> {
        let instance: BootHooks<T>;
        let builder: IAnnotationBuilder<T>;
        let token;
        if (isToken(runable)) {
            token = runable;
            await this.build(token, config, data, (cfg, hook, builder) => {
                config = cfg;
                instance = hook;
                builder = builder;
            });
        } else {
            data = config;
            config = runable;
            token = this.getMetaAccessor(null, config).getToken(config, this.container);
            await this.build(token, config, data, (cfg, hook, builder) => {
                config = cfg;
                instance = hook;
                builder = builder;
            });
        }
        builder = builder || this;

        return await builder.run(instance, config, data, token);
    }

    async createInstance(token: Token<T>, config: AnnotationConfigure<T>, data?: any): Promise<T> {
        if (!token) {
            return null;
        }

        if (!this.container.has(token)) {
            console.log(`can not find token ${token ? token.toString() : null} in container.`);
            return null;
        }


        let instance = this.resolveToken(token, data);
        return instance;
    }

    getBuilder(token: Token<T>, config?: AnnotationConfigure<T>): IAnnotationBuilder<T> {
        let builder: IAnnotationBuilder<T>;
        let providers = [{ provide: ContainerToken, useValue: this.container }, { provide: Container, useValue: this.container }] as ParamProviders[];
        if (config && config.annoBuilder) {
            if (isClass(config.annoBuilder)) {
                if (!this.container.has(config.annoBuilder)) {
                    this.container.register(config.annoBuilder);
                }
            }
            if (isToken(config.annoBuilder)) {
                builder = this.container.resolve(config.annoBuilder, ...providers);
            } else if (config.annoBuilder instanceof AnnotationBuilder) {
                builder = config.annoBuilder;
            }
        }
        if (!builder && token) {
            builder = this.container.getService(AnnotationBuilderToken,
                token,
                (tk) => new InjectAnnotationBuilder(tk),
                config.defaultAnnoBuilder || AnnotationBuilderToken,
                ...providers) as IAnnotationBuilder<T>;
        }

        if (builder && !builder.container) {
            builder.container = this.container;
        }
        return builder || this;
    }

    /**
     * bundle instance via config.
     *
     * @param {T} instance
     * @param {AnnotationConfigure} config
     * @param {IContainer} [container]
     * @returns {Promise<T>}
     * @memberof BootBuilder
     */
    async buildStrategy(instance: T, config: AnnotationConfigure<T>, data?: any): Promise<T> {
        return instance;
    }

    async run(instance: T, cfg: AnnotationConfigure<T>, data?: any, token?: Token<T>): Promise<Runnable<T>> {
        if (!instance) {
            return null;
        }

        token = token || lang.getClass(instance);

        if (instance instanceof Runner) {
            await instance.run(data);
            return instance;
        } else if (instance instanceof Service) {
            await instance.start(data);
            return instance;
        } else {
            let providers = [{ provide: token, useValue: instance }, { token: token, instance: instance, config: cfg }] as ParamProviders[];
            let runner: IRunner<T> = this.container.getService(RunnerToken, token, tk => new InjectRunnerToken(tk), ...providers);
            let service: IService<T>;
            if (!runner) {
                service = this.container.getService(ServiceToken, token, tk => new InjectServiceToken(tk), ...providers);
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

    /**
     * register extension before create instance.
     *
     * @protected
     * @param {AnnotationConfigure<T>} [config]
     * @memberof AnnotationBuilder
     */
    protected async registerExts(config?: AnnotationConfigure<T>) {

    }

    protected isEqual(build: IAnnotationBuilder<T>) {
        if (!build) {
            return false;
        }
        if (build === this) {
            return true;
        }
        if (lang.getClass(build) === lang.getClass(this)) {
            return true;
        }
        return false;
    }

    protected resolveToken(token: Token<T>, data?: any) {
        return this.container.resolve(token);
    }
}
