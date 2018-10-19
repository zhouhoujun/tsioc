import { IAnnotationBuilder, AnnotationBuilderToken, InjectAnnotationBuilder } from './IAnnotationBuilder';
import {
    Token, isToken, IContainer, isClass, Inject, ContainerToken, Type, Providers,
    lang, isFunction, Injectable, AnnotationMetaAccessorToken, Container
} from '@ts-ioc/core';
import { AnnotationConfigure } from './AnnotationConfigure';
import { Annotation } from '../decorators';
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

    async build(token: Token<T>, config?: AnnotationConfigure<T>, data?: any): Promise<T> {
        if (isClass(token) && !this.container.hasRegister(token)) {
            this.container.register(token);
        }
        config = this.getTokenMetaConfig(token, config);
        let builder = this.getBuilder(token, config);
        if (!this.isEqual(builder)) {
            return builder.build(token, config, data);
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

    async buildByConfig(config: Token<T> | AnnotationConfigure<T>, data?: any, ...excludeTokens: Token<any>[]): Promise<any> {
        let token: Token<T>;
        if (isToken(config)) {
            token = config;
            if (excludeTokens.indexOf(token) >= 0) {
                token = null;
            }
            return this.build(token, null, data);
        } else {
            token = this.getType(config);
            if (excludeTokens.indexOf(token) >= 0) {
                token = null;
            }
            return this.build(token, config, data);
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
        let providers = [{ provide: ContainerToken, useValue: this.container }, { provide: Container, useValue: this.container }] as Providers[];
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
            builder = this.container.getRefService(InjectAnnotationBuilder, token, null, ...providers) as IAnnotationBuilder<T>;
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
        let accessor = this.container.resolve(AnnotationMetaAccessorToken, { decorator: decorator ? [decorator, defDecorator] : defDecorator });
        if (accessor) {
            return accessor.getMetadata(token, this.container);
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
        if (build.constructor === this.constructor) {
            return true;
        }
        return false;
    }

    protected resolveToken(token: Token<T>, data?: any) {
        return this.container.resolve(token);
    }
}
