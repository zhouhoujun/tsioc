import {
    Token, isToken, IContainer, isClass, Inject, ContainerToken,
    lang, isFunction, Injectable, Container, IMetaAccessor, ParamProviders,
    InjectMetaAccessorToken, MetaAccessorToken, isNullOrUndefined, isBaseType, RefTagLevel
} from '@ts-ioc/core';
import { IAnnotationBuilder, AnnotationBuilderToken, InjectAnnotationBuilder } from './IAnnotationBuilder';
import {
    Runnable, Runner, Service, RunnerToken,
    ServiceToken, isRunner, isService, InjectRunnableToken
} from '../runnable';
import { BootHooks, BuildOptions } from './AnnoType';
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
     * @param {(Token<any>|| AnnotationConfigure<T>)} token
     * @param {AnnotationConfigure<T>} [config]
     * @returns {IMetaAccessor<any>}
     * @memberof AnnotationBuilder
     */
    getMetaAccessor(token: Token<any> | AnnotationConfigure<T>, config?: AnnotationConfigure<T>): IMetaAccessor<any> {
        let mtk: Token<any>;
        if (isToken(token)) {
            mtk = token;
        } else {
            config = token;
        }
        return this.container.getService(MetaAccessorToken,
            mtk ? [mtk, lang.getClass(this)] : lang.getClass(this),
            tk => new InjectMetaAccessorToken(tk), config ? (config.defaultMetaAccessor || MetaAccessorToken) : MetaAccessorToken);
    }


    /**
     * build token type with config.
     *
     * @param {(Token<T> | AnnotationConfigure<T>)} token
     * @param {(AnnotationConfigure<T> | BuildOptions<T>)} [config]
     * @param {BuildOptions<T>} [options]
     * @returns {Promise<T>}
     * @memberof AnnotationBuilder
     */
    async build(token: Token<T> | AnnotationConfigure<T>, config?: AnnotationConfigure<T> | BuildOptions<T>, options?: BuildOptions<T>): Promise<T> {
        let tk: Token<T>;
        let cfg: AnnotationConfigure<T>;
        if (isToken(token)) {
            tk = token;
            if (isNullOrUndefined(options)) {
                options = config;
                cfg = null;
            } else {
                cfg = config as AnnotationConfigure<T>;
            }
            cfg = this.getMetaAccessor(tk, cfg).getMetadata(tk, this.container, cfg);
        } else {
            options = config;
            cfg = token;
            tk = this.getMetaAccessor(cfg).getToken(cfg, this.container);
        }

        if (isClass(tk) && !this.container.hasRegister(tk)) {
            this.container.register(tk);
        }
        if (options && isFunction(options.vaild) && !options.vaild(tk)) {
            return null;
        }

        let builder = (options && options.builder) ? options.builder : this.getBuilder(tk, cfg);
        if (!this.isEqual(builder)) {
            return await builder.build(tk, cfg, lang.assign(options || {}, { builder: builder }));
        } else {
            await this.registerExts(cfg);
            let instance = await this.createInstance(tk, cfg, options) as BootHooks<T>;
            if (!instance) {
                return null;
            }
            if (isFunction(instance.anBeforeInit)) {
                await Promise.resolve(instance.anBeforeInit(cfg));
            }
            instance = await this.buildStrategy(instance, cfg, options) as BootHooks<T>;
            if (isFunction(instance.anAfterInit)) {
                await Promise.resolve(instance.anAfterInit(cfg));
            }
            if (options && isFunction(options.onCompleted)) {
                options.onCompleted(tk, cfg, instance, this);
            }
            return instance;
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
    async boot(runable: Token<T> | AnnotationConfigure<T>, config?: AnnotationConfigure<T> | BuildOptions<T>, options?: BuildOptions<T>): Promise<Runnable<T>> {
        let instance: BootHooks<T>;
        let builder: IAnnotationBuilder<T>;
        let tk: Token<T>;
        let cfg: AnnotationConfigure<T>;
        if (isToken(runable)) {
            await this.build(runable, config, lang.assign({
                onComplete: (token, config, hook, builder) => {
                    tk = token;
                    cfg = config;
                    instance = hook;
                    builder = builder;
                }
            }, options));
        } else {
            await this.build(runable, lang.assign({
                onComplete: (token, config, hook, builder) => {
                    tk = token;
                    cfg = config;
                    instance = hook;
                    builder = builder;
                }
            }, config));
        }
        builder = builder || this;

        let runner = builder.resolveRunable(instance, cfg, tk, options);
        let data = options ? options.data : undefined;
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
    resolveRunable(instance: T, config?: AnnotationConfigure<T>, token?: Token<T> | BuildOptions<T>, options?: BuildOptions<T>): Runnable<T> {
        if (!instance) {
            return null;
        }

        let tk: Token<T>;
        if (isToken(token)) {
            tk = token;
        } else {
            options = token;
        }

        tk = tk || lang.getClass(instance);
        if (!config) {
            config = this.getMetaAccessor(tk).getMetadata(tk, this.container);
        }

        if (instance instanceof Runner || instance instanceof Service) {
            return instance;
        } else {
            let providers = [{ provide: tk, useValue: instance }, { token: tk, instance: instance, config: config }] as ParamProviders[];
            return this.container.getService(
                [RunnerToken, ServiceToken],
                [
                    { target: tk, level: RefTagLevel.selfProviders },
                    ...((options && options.target) ? [{ target: lang.getClass(options.target), level: RefTagLevel.self }] : []),
                    { target: tk, level: RefTagLevel.chainProviders }

                ],
                tk => new InjectRunnableToken(tk), config.defaultRunnable || true, ...providers);
        }
    }


    async createInstance(token: Token<T>, config: AnnotationConfigure<T>, options?: BuildOptions<T>): Promise<T> {
        if (!isToken(token)) {
            return null;
        }

        let instance = this.resolveToken(token, options ? options.target : undefined);
        if (isNullOrUndefined(instance)) {
            console.log(`can not find token ${token ? token.toString() : null} in container.`);
            return null;
        }

        return instance;
    }

    getBuilder(token: Token<T>, config?: AnnotationConfigure<T>, options?: BuildOptions<T>): IAnnotationBuilder<T> {
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
        if (options && options.builder) {
            builder = options.builder;
        }
        if (!builder && token) {
            builder = this.container.getService(AnnotationBuilderToken,
                [
                    token,
                    ...(options && options.target) ? [{ target: lang.getClass(options.target), level: RefTagLevel.self }] : []
                ],
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
     * @param {BuildOptions<T>} [options]
     * @returns {Promise<T>}
     * @memberof AnnotationBuilder
     */
    async buildStrategy(instance: T, config: AnnotationConfigure<T>, options?: BuildOptions<T>): Promise<T> {
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
        // if (lang.getClass(build) === lang.getClass(this)) {
        //     return true;
        // }
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
