import {
    Token, isToken, isClass, Inject,
    lang, isFunction, ParamProviders, isNullOrUndefined,
    isUndefined, Singleton, ProviderTypes
} from '@ts-ioc/ioc';
import { IAnnotationBuilder, AnnotationBuilderToken, InjectAnnotationBuilder } from './IAnnotationBuilder';
import {
    Runnable, Runner, Service, RunnerToken,
    ServiceToken, isRunner, isService, InjectRunnableToken,
    RunnableOptionsToken, RunnableOptions
} from '../runnable';
import { BootHooks, BuildOptions } from './AnnoType';
import { AnnotationConfigure } from './AnnotationConfigure';
import { AnnoBuildStrategyToken, InjectAnnoBuildStrategyToken } from './AnnoBuildStrategy';
import { ContainerToken, IContainer, RefTagLevel } from '@ts-ioc/core';
import { MetaAccessor } from '../services';

/**
 * Annotation class builder. build class with metadata and config.
 *
 * @export
 * @class AnnotationBuilder
 * @implements {implements IAnnotationBuilder<T>}
 * @template T
 */
@Singleton(AnnotationBuilderToken)
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
    getMetaAccessor(token: Token<any> | AnnotationConfigure<T>, config?: AnnotationConfigure<T>): MetaAccessor {
        let mtk: Token<any>;
        if (isToken(token)) {
            mtk = token;
        } else {
            config = token;
        }
        return this.container.getService(MetaAccessor,
            mtk ? [mtk, lang.getClass(this)] : lang.getClass(this),
            config ? (config.defaultMetaAccessor || MetaAccessor) : MetaAccessor);
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
            if (isUndefined(options)) {
                options = config as BuildOptions<T>;
                cfg = null;
            } else {
                cfg = config as AnnotationConfigure<T>;
            }
            cfg = this.getMetaAccessor(tk, cfg).getMetadata(tk, this.container, cfg);
        } else {
            options = config as BuildOptions<T>;
            cfg = token;
            let accessor = this.getMetaAccessor(cfg);
            tk = accessor.getToken(cfg, this.container);
            if (isToken(tk)) {
                cfg = accessor.getMetadata(tk, this.container, cfg);
            }
        }

        if (isClass(tk) && !this.container.hasRegister(tk)) {
            this.container.register(tk);
        }
        if (options && isFunction(options.vaild) && !options.vaild(tk)) {
            return null;
        }

        let builder = (options && options.builder) ? options.builder : this.getBuilder(tk, cfg);
        if (!this.isEqual(builder)) {
            return await builder.build(tk, cfg, Object.assign(options || {}, { builder: builder }));
        } else {
            await this.registerExts(cfg);
            let instance = await this.createInstance(tk, cfg, options);
            if (!instance) {
                return null;
            }
            let strategy = this.container.getService(AnnoBuildStrategyToken,
                [
                    tk || lang.getClass(instance),
                    ...((options && options.target) ? [{ target: lang.getClass(options.target), level: RefTagLevel.self }] : []),
                    { target: lang.getClass(this), level: RefTagLevel.self }

                ], tk => new InjectAnnoBuildStrategyToken(tk));
            if (strategy) {
                await strategy.build(instance, cfg, options);
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
        let onCompleted = (token, config, hook, builder) => {
            tk = token;
            cfg = config;
            instance = hook;
            builder = builder;
        };
        if (isToken(runable)) {
            if (isUndefined(options)) {
                options = config as BuildOptions<T>;
                cfg = null;
            } else {
                cfg = config as AnnotationConfigure<T>;
            }
            await this.build(runable, cfg, Object.assign({
                onCompleted: onCompleted
            }, options));
        } else {
            await this.build(runable, Object.assign({
                onCompleted: onCompleted
            }, config));
        }
        builder = builder || this;

        let data = options ? options.data : undefined;
        let runOptions: RunnableOptions<T> = { instance: instance, type: lang.getClass(instance), mdToken: tk, config: cfg, data: data };
        let runner = builder.resolveRunable(instance, runOptions, options);
        if (runner && isFunction(runner.onInit)) {
            await runner.onInit(runOptions, options);
        }

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
    resolveRunable(instance: T, runableOptions: RunnableOptions<T>, options?: BuildOptions<T>): Runnable<T> {
        if (!instance) {
            return null;
        }

        let tk: Token<T> = runableOptions.mdToken || runableOptions.type;

        if (!runableOptions.config) {
            runableOptions.config = this.getMetaAccessor(tk).getMetadata(tk, this.container);
        }

        if (instance instanceof Runner || instance instanceof Service) {
            return instance;
        } else {
            let provider = { provide: RunnableOptionsToken, useValue: runableOptions.config } as ParamProviders;
            return this.container.getService(
                [RunnerToken, ServiceToken],
                [
                    tk,
                    ...((options && options.target) ? [{ target: lang.getClass(options.target), level: RefTagLevel.self }] : []),
                    { target: lang.getClass(this), level: RefTagLevel.self }

                ],
                tk => new InjectRunnableToken(tk),
                runableOptions.config.defaultRunnable || true, provider);
        }
    }


    async createInstance(token: Token<T>, config: AnnotationConfigure<T>, options?: BuildOptions<T>): Promise<T> {
        if (!isToken(token)) {
            return null;
        }

        let instance = this.resolveToken(token, options ? options.target : undefined, ...(options.providers || []));
        if (isNullOrUndefined(instance)) {
            console.log(`can not find token ${token ? token.toString() : null} in container.`);
            return null;
        }

        return instance;
    }

    getBuilder(token: Token<T>, config?: AnnotationConfigure<T>, options?: BuildOptions<T>): IAnnotationBuilder<T> {
        let builder: IAnnotationBuilder<T>;
        if (config && config.annoBuilder) {
            if (isClass(config.annoBuilder)) {
                if (!this.container.has(config.annoBuilder)) {
                    this.container.register(config.annoBuilder);
                }
            }
            if (isToken(config.annoBuilder)) {
                builder = this.container.resolve(config.annoBuilder);
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
                config.defaultAnnoBuilder || AnnotationBuilderToken) as IAnnotationBuilder<T>;
        }

        if (builder && !builder.container) {
            builder.container = this.container;
        }
        return builder || this;
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

    protected resolveToken(token: Token<T>, target?: any, ...providers: ProviderTypes[]) {
        if (target) {
            return this.container.getService(token, target, ...providers);
        }
        return this.container.resolve(token, ...providers);
    }
}
