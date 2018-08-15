import { IAnnotationBuilder, AnnotationBuilderToken } from './IAnnotationBuilder';
import { Singleton, Token, isToken, IContainer, isClass, Inject, ContainerToken, Type, hasOwnClassMetadata, getTypeMetadata, lang, isFunction } from '@ts-ioc/core';
import { AnnotationConfigure } from './AnnotationConfigure';
import { Annotation } from './decorators';
import { AnnoInstance } from './IAnnotation';

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
     * @memberof BootBuilder
     */
    @Inject(ContainerToken)
    public container: IContainer;

    constructor() {
    }

    async build(token: Token<T>, config?: AnnotationConfigure<T>, data?: any): Promise<T> {
        if (!config) {
            config = this.getTokenMetaConfig(token);
        }
        let builder = this.getBuilder(config);
        if (builder !== this) {
            return builder.build(token, config, data);
        } else {
            let instance = await this.createInstance(token, config, data) as AnnoInstance<T>;
            if (isFunction(instance.anBeforeInit)) {
                await Promise.resolve(instance.anBeforeInit(config));
            }
            instance = await this.buildStrategy(instance, config) as AnnoInstance<T>;
            if (isFunction(instance.anAfterInit)) {
                await Promise.resolve(instance.anAfterInit(config));
            }
            return instance;
        }
    }

    async buildByConfig(config: Token<T> | AnnotationConfigure<T>, data?: any): Promise<any> {
        let token: Token<T>;
        if (isToken(config)) {
            token = config;
            return this.build(token, this.getTokenMetaConfig(token), data);
        } else {
            token = this.getType(config);
            return this.build(token, this.getTokenMetaConfig(token, config), data);
        }
    }

    async createInstance(token: Token<T>, config: AnnotationConfigure<T>, data?: any): Promise<T> {
        if (!token) {
            throw new Error('cant not find bootstrap token.');
        }
        if (!this.container.has(token)) {
            if (isClass(token)) {
                this.container.register(token);
            } else {
                console.log(`cant not find token ${token.toString()} in container.`);
                return null;
            }
        }

        let instance = this.resolveToken(token, data);
        return instance;
    }

    getBuilder(config: AnnotationConfigure<T>): IAnnotationBuilder<T> {
        if (config && config.annotationBuilder) {
            if (isClass(config.annotationBuilder)) {
                if (!this.container.has(config.annotationBuilder)) {
                    this.container.register(config.annotationBuilder);
                }
            }
            if (isToken(config.annotationBuilder)) {
                return this.container.resolve(config.annotationBuilder);
            } else if (config.annotationBuilder instanceof AnnotationBuilder) {
                return config.annotationBuilder;
            }
        }
        return this;
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
    async buildStrategy(instance: T, config: AnnotationConfigure<T>): Promise<T> {
        return instance;
    }

    getType(config: AnnotationConfigure<T>): Token<T> {
        return config.token || config.type;
    }

    protected getTokenMetaConfig(token: Token<T>, config?: AnnotationConfigure<T>): AnnotationConfigure<T> {
        let cfg: AnnotationConfigure<T>;
        if (isClass(token)) {
            cfg = this.getMetaConfig(token);
        } else if (isToken(token)) {
            let tokenType = this.container ? this.container.getTokenImpl(token) : token;
            if (isClass(tokenType)) {
                cfg = this.getMetaConfig(tokenType);
            }
        }
        if (cfg) {
            return lang.assign({}, cfg, config || {});
        } else {
            return config || {};
        }
    }

    getDecorator() {
        return Annotation.toString();
    }

    protected getMetaConfig(token: Type<any>): AnnotationConfigure<T> {
        let decorator = this.getDecorator();
        if (hasOwnClassMetadata(decorator, token)) {
            let metas = getTypeMetadata<AnnotationConfigure<T>>(decorator, token);
            if (metas && metas.length) {
                return metas[0];
            }
        }
        return null;
    }

    protected resolveToken(token: Token<T>, data?: any) {
        return this.container.resolve(token, data);
    }
}
