import { ITypeBuilder, TypeBuilderToken } from './ITypeBuilder';
import { Singleton, Token, isToken, IContainer, isClass, Inject, ContainerToken, Type, hasOwnClassMetadata, getTypeMetadata, lang } from '@ts-ioc/core';
import { TypeConfigure } from './TypeConfigure';
import { Build } from './decorators';

/**
 * token bootstrap builder. build class with metadata and config.
 *
 * @export
 * @class BootBuilder
 * @implements {implements ITypeBuilder<T>}
 * @template T
 */
@Singleton(TypeBuilderToken)
export class TypeBuilder<T> implements ITypeBuilder<T> {
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

    async build(token: Token<T>, config?: TypeConfigure<T>, data?: any): Promise<T> {
        if (!config) {
            config = this.getTokenMetaConfig(token);
        }
        let builder = this.getBuilder(config);
        if (builder !== this) {
            return builder.build(token, config, data);
        } else {
            let instance = await this.createInstance(token, config, data);
            instance = await this.buildStrategy(instance, config);
            return instance;
        }
    }

    async buildByConfig(config: Token<T> | TypeConfigure<T>, data?: any): Promise<any> {
        let token: Token<T>;
        if (isToken(config)) {
            token = config;
            return this.build(token, this.getTokenMetaConfig(token), data);
        } else {
            token = this.getBootstrapToken(config);
            return this.build(token, this.getTokenMetaConfig(token, config), data);
        }
    }

    async createInstance(token: Token<T>, config: TypeConfigure<T>, data?: any): Promise<T> {
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

    getBuilder(config: TypeConfigure<T>): ITypeBuilder<T> {
        if (config && config.typeBuilder) {
            if (isClass(config.typeBuilder)) {
                if (!this.container.has(config.typeBuilder)) {
                    this.container.register(config.typeBuilder);
                }
            }
            if (isToken(config.typeBuilder)) {
                return this.container.resolve(config.typeBuilder);
            } else if (config.typeBuilder instanceof TypeBuilder) {
                return config.typeBuilder;
            }
        }
        return this;
    }

    /**
     * bundle instance via config.
     *
     * @param {T} instance
     * @param {TypeConfigure} config
     * @param {IContainer} [container]
     * @returns {Promise<T>}
     * @memberof BootBuilder
     */
    async buildStrategy(instance: T, config: TypeConfigure<T>): Promise<T> {
        return instance;
    }

    getBootstrapToken(config: TypeConfigure<T>): Token<T> {
        return config.bootstrap;
    }

    protected getTokenMetaConfig(token: Token<T>, config?: TypeConfigure<T>): TypeConfigure<T> {
        let cfg: TypeConfigure<T>;
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
        return Build.toString();
    }

    protected getMetaConfig(token: Type<any>): TypeConfigure<T> {
        let decorator = this.getDecorator();
        if (hasOwnClassMetadata(decorator, token)) {
            let metas = getTypeMetadata<TypeConfigure<T>>(decorator, token);
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
