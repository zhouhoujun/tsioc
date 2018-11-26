import {
    Token, isToken, IContainer, isClass, Inject, ContainerToken, Type, ProviderTypes,
    lang, isFunction, Injectable, AnnotationMetaAccessorToken, Container, InjectReference, isArray, RefTokenType
} from '@ts-ioc/core';
import { IAnnotationBuilder, AnnotationBuilderToken, AnnotationConfigure, InjectAnnotationBuilder } from './IAnnotationBuilder';
import { AnnoInstance } from './IAnnotation';
import { Annotation } from '../decorators';

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
        config = this.getTokenMetaConfig(token, config);
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
            token = this.getType(config);
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
        if (config && config.annotationBuilder) {
            if (isClass(config.annotationBuilder)) {
                if (!this.container.has(config.annotationBuilder)) {
                    this.container.register(config.annotationBuilder);
                }
            }
            if (isToken(config.annotationBuilder)) {
                builder = this.container.resolve(config.annotationBuilder, ...providers);
            } else if (config.annotationBuilder instanceof AnnotationBuilder) {
                builder = config.annotationBuilder;
            }
        }
        if (!builder && token) {
            builder = this.container.getRefService(
                tk => this.getRefAnnoTokens(tk),
                token,
                null,
                ...providers) as IAnnotationBuilder<T>;
        }

        if (builder && !builder.container) {
            builder.container = this.container;
        }
        return builder || this;
    }

    protected getRefAnnoTokens(tk): RefTokenType<any>[] {
        return [
            new InjectAnnotationBuilder(tk),
            { token: AnnotationBuilderToken, isRef: false },
            new InjectReference(lang.getClass(this), tk),
            new InjectReference(AnnotationBuilder, tk)
        ]
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

    getType(config: AnnotationConfigure<T>): Token<T> {
        return config.token || config.type;
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

    protected getTokenMetaConfig(token: Token<T>, config?: AnnotationConfigure<T>): AnnotationConfigure<T> {
        let cfg: AnnotationConfigure<T>;
        let decorator = config ? config.decorator : null;
        if (isClass(token)) {
            cfg = this.getMetaConfig(token, decorator);
        } else if (isToken(token)) {
            let tokenType = this.container ? this.container.getTokenImpl(token) : token;
            if (isClass(tokenType)) {
                cfg = this.getMetaConfig(tokenType, decorator);
            }
        }
        if (cfg) {
            return lang.assign({}, cfg, config || {});
        } else {
            return config || {};
        }
    }

    /**
     * get default decorator.
     *
     * @returns
     * @memberof AnnotationBuilder
     */
    getDecorator() {
        return Annotation.toString();
    }

    protected getMetaConfig(token: Type<any>, decorator?: string): AnnotationConfigure<T> {
        let defDecorator = this.getDecorator();
        let accessor = this.container.resolve(AnnotationMetaAccessorToken);
        if (accessor) {
            let decors: string[] = isArray(defDecorator) ? defDecorator : [defDecorator];
            if (decorator) {
                decors.unshift(decorator);
            }
            return accessor.getMetadata(token, this.container, decors.length ? d => decors.indexOf(d) > 0 : undefined);
        }
        return null;
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
