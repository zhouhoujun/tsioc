import { IBootBuilder, BootBuilderToken } from './IBootBuilder';
import { Singleton, Token, isToken, IContainer, isClass, Inject, ContainerToken } from '@ts-ioc/core';
import { ModuleConfigure } from './ModuleConfigure';

/**
 * token bootstrap builder. build class with metadata and config.
 *
 * @export
 * @class BootBuilder
 * @implements {implements IBootBuilder<T>}
 * @template T
 */
@Singleton(BootBuilderToken)
export class BootBuilder<T> implements IBootBuilder<T> {
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

    async build(token: Token<T>, config: ModuleConfigure, data?: any): Promise<T> {
        let builder = this.getBuilder(token, config);
        if (builder !== this) {
            return builder.build(token, config, data);
        } else {
            let instance = await this.createInstance(token, config, data);
            instance = await this.buildStrategy(instance, config);
            return instance;
        }
    }

    async buildByConfig(config: Token<T> | ModuleConfigure, data?: any): Promise<any> {
        let token: Token<T>;
        if (isToken(config)) {
            token = config;
            return this.build(token, this.getTokenMetaConfig(token), data);
        } else {
            token = this.getBootstrapToken(config);
            return this.build(token, this.getTokenMetaConfig(token, config), data);
        }
    }

    async createInstance(token: Token<T>, config: ModuleConfigure, data?: any): Promise<T> {
        if (!token) {
            throw new Error('cant not find bootstrap token.');
        }
        if (!this.container.has(token)) {
            if (isClass(token)) {
                console.log('boot builder', token);
                this.container.register(token);
            } else {
                throw new Error(`cant not find token ${token.toString()} in container.`);
            }
        }

        let instance = this.resolveToken(token, data);
        return instance;
    }

    getBuilder(token: Token<T>, config?: ModuleConfigure): IBootBuilder<T> {
        return this;
    }

    /**
     * bundle instance via config.
     *
     * @param {T} instance
     * @param {ModuleConfigure} config
     * @param {IContainer} [container]
     * @returns {Promise<T>}
     * @memberof BootBuilder
     */
    async buildStrategy(instance: T, config: ModuleConfigure): Promise<T> {
        return instance;
    }

    getBootstrapToken(config: ModuleConfigure): Token<T> {
        return config.bootstrap;
    }

    protected getTokenMetaConfig(token: Token<T>, config?: ModuleConfigure): ModuleConfigure {
        return config;
    }

    protected resolveToken(token: Token<T>, data?: any) {
        return this.container.resolve(token, data);
    }
}
