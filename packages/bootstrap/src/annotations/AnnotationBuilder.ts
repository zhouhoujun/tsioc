import {
    Token, isToken, IContainer, isClass, Inject, ContainerToken,
    lang, isFunction, Injectable, Container, IMetaAccessor, ParamProviders,
    InjectMetaAccessorToken, MetaAccessorToken, isNullOrUndefined, isBaseType
} from '@ts-ioc/core';
import { IAnnotationBuilder, AnnotationBuilderToken, InjectAnnotationBuilder } from './IAnnotationBuilder';
import {
    Runnable, Runner, Service, RunnerToken,
    ServiceToken, isRunner, isService, InjectRunnableToken
} from '../runnable';
import { AnnoTokenVaild, BootHooks, AnnoBuildCompleted } from './AnnoType';
import { AnnotationConfigure } from './AnnotationConfigure';

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
     * @memberof AnnotationBuilder
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
     * @param {*} [target] build target
     * @returns {Promise<T>}
     * @memberof AnnotationBuilder
     */
    async build(token: Token<T>, config?: AnnotationConfigure<T>, target?: any, completed?: AnnoBuildCompleted<T>): Promise<T> {
        if (isClass(token) && !this.container.hasRegister(token)) {
            this.container.register(token);
        }

        config = this.getMetaAccessor(token, config).getMetadata(token, this.container, config);
        let builder = this.getBuilder(token, config);
        if (!this.isEqual(builder)) {
            return await builder.build(token, config, target, completed);
        } else {
            await this.registerExts(config);
            let instance = await this.createInstance(token, config, target) as BootHooks<T>;
            if (!instance) {
                return null;
            }
            if (isFunction(instance.anBeforeInit)) {
                await Promise.resolve(instance.anBeforeInit(config));
            }
            instance = await this.buildStrategy(instance, config, target) as BootHooks<T>;
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
     * @param {*} [target] build data.
     * @param {AnnoTokenVaild} [vaild]
     * @returns {Promise<T>}
     * @memberof IAnnotationBuilder
     */
    async buildByConfig(config: Token<T> | AnnotationConfigure<T>, target?: any, vaild?: AnnoTokenVaild<T>): Promise<T> {
        let token: Token<T>;
        if (isToken(config)) {
            token = config;
            if (vaild && !vaild(token)) {
                token = null;
            }
            return await this.build(token, null, target);
        } else {
            token = this.getMetaAccessor(null, config).getToken(config, this.container);
            if (vaild && !vaild(token)) {
                token = null;
            }
            return await this.build(token, config, target);
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

        let runner = builder.resolveRunable(instance, config, token);
        if (isRunner(runner)) {
            await runner.run(data);
        } else if (isService(runner)) {
            await runner.start(data);
        }
        return runner;
    }

    /**
     * run annotation instance.
     *
     * @param {T} instance
     * @param {AnnotationConfigure<T>} [config]
     * @param {Token<T>} [token]
     * @returns {Promise<Runnable<T>>}
     * @memberof AnnotationBuilder
     */
    resolveRunable(instance: T, config?: AnnotationConfigure<T>, token?: Token<T>): Runnable<T> {
        if (!instance) {
            return null;
        }

        token = token || lang.getClass(instance);
        if (!config) {
            config = this.getMetaAccessor(token).getMetadata(token, this.container);
        }

        if (instance instanceof Runner || instance instanceof Service) {
            return instance;
        } else {
            let providers = [{ provide: token, useValue: instance }, { token: token, instance: instance, config: config }] as ParamProviders[];
            return this.container.getService([RunnerToken, ServiceToken], token, tk => new InjectRunnableToken(tk), config.defaultRunnable || true, ...providers);
        }
    }


    async createInstance(token: Token<T>, config: AnnotationConfigure<T>, target?: any): Promise<T> {
        if (!token) {
            return null;
        }

        let instance = this.resolveToken(token, target);
        if (isNullOrUndefined(instance)) {
            console.log(`can not find token ${token ? token.toString() : null} in container.`);
            return null;
        }

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
     * @memberof AnnotationBuilder
     */
    async buildStrategy(instance: T, config: AnnotationConfigure<T>, data?: any): Promise<T> {
        return instance;
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

    protected resolveToken(token: Token<T>, target?: any) {
        let targetClass;
        if (target && !isBaseType(target)) {
            targetClass = lang.getClass(target);
        }
        if (targetClass) {
            return this.container.getService(token, targetClass);
        }
        return this.container.resolve(token);
    }
}
