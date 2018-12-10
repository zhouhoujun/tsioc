import {
    Token, isToken, IContainer, isClass, Inject, ContainerToken,
    lang, isFunction, Injectable, Container,  IMetaAccessor,
    InjectMetaAccessorToken, MetaAccessorToken, ProviderTypes
} from '@ts-ioc/core';
import { IAnnotationBuilder, AnnotationBuilderToken, AnnotationConfigure, InjectAnnotationBuilder } from './IAnnotationBuilder';
import { AnnoInstance } from './IAnnotation';

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
     * @memberof ITypeBuilder
     */
    async build(token: Token<T>, config?: AnnotationConfigure<T>, data?: any): Promise<T> {
        if (isClass(token) && !this.container.hasRegister(token)) {
            this.container.register(token);
        }

        config = this.getMetaAccessor(token, config).getMetadata(token, this.container, config);
        let builder = this.getBuilder(token, config);
        if (!this.isEqual(builder)) {
            return await builder.build(token, config, data);
        } else {
            await this.registerExts(config);
            let instance = await this.createInstance(token, config, data) as AnnoInstance<T>;
            if (!instance) {
                return null;
            }
            if (isFunction(instance.anBeforeInit)) {
                await Promise.resolve(instance.anBeforeInit(config));
            }
            instance = await this.buildStrategy(instance, config, data) as AnnoInstance<T>;
            if (isFunction(instance.anAfterInit)) {
                await Promise.resolve(instance.anAfterInit(config));
            }
            return instance;
        }
    }

    /**
     * build instance via type config.
     *
     * @param {(Token<T> | AnnotationConfigure<T>)} config
     * @param {*} [data] build data.
     * @param {...Token<any>[]} excludeTokens
     * @returns {Promise<T>}
     * @memberof IAnnotationBuilder
     */
    async buildByConfig(config: Token<T> | AnnotationConfigure<T>, data?: any, ...excludeTokens: Token<any>[]): Promise<any> {
        let token: Token<T>;
        if (isToken(config)) {
            token = config;
            if (excludeTokens.indexOf(token) >= 0) {
                token = null;
            }
            return await this.build(token, null, data);
        } else {
            token = this.getMetaAccessor(null, config).getToken(config, this.container);
            if (excludeTokens.indexOf(token) >= 0) {
                token = null;
            }
            return await this.build(token, config, data);
        }
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
        let providers = [{ provide: ContainerToken, useValue: this.container }, { provide: Container, useValue: this.container }] as ProviderTypes[];
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
