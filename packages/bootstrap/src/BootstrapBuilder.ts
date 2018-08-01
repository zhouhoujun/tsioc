import { IBootstrapBuilder, BootstrapBuilderToken } from './IBootstrapBuilder';
import { Singleton, Token, isToken, IContainer, Inject, ContainerToken } from '@ts-ioc/core';
import { ModuleConfigure, ModuleConfiguration } from './ModuleConfiguration';
/**
 * bootstrap builder. build class with metadata and config.
 *
 * @export
 * @class BootstrapBuilder
 * @implements {IBootstrapBuilder}
 * @template T
 */
@Singleton(BootstrapBuilderToken)
export class BootstrapBuilder<T> implements IBootstrapBuilder<T> {
    /**
     * ioc container.
     *
     * @type {IContainer}
     * @memberof BootstrapBuilder
     */
    @Inject(ContainerToken)
    container: IContainer;

    constructor() {

    }

    async build(token: Token<T> | ModuleConfiguration<T>, data?: any): Promise<T> {
        let bootToken, config;
        if (isToken(token)) {
            bootToken = token;
        } else {
            config = token;
            bootToken = this.getBootstrapToken(config);
        }
        let instance = await this.createInstance(bootToken, data);
        instance = await this.buildStrategy(instance, config);
        return instance;
    }

    async createInstance(token: Token<T>, config: ModuleConfiguration<T>, data?: any): Promise<T> {
        if (!token) {
            throw new Error('cant not find bootstrap token.');
        }
        if (!this.container.has(token)) {
            throw new Error('cant not find container.');
        }

        let instance = this.resolveToken(token, data);
        return instance;
    }


    /**
     * bundle instance via config.
     *
     * @param {T} instance
     * @param {ModuleConfiguration<T>} config
     * @param {IContainer} [container]
     * @returns {Promise<T>}
     * @memberof BootstrapBuilder
     */
    async buildStrategy(instance: T, config: ModuleConfiguration<T>): Promise<T> {
        return instance;
    }

    getBootstrapToken(config: ModuleConfiguration<T>): Token<T> {
        return config.bootstrap;
    }

    protected resolveToken(token: Token<T>, data?: any) {
        return this.container.resolve(token, data);
    }

    protected getBuilderViaConfig(builder: Token<IBootstrapBuilder<T>> | IBootstrapBuilder<T>, container: IContainer): IBootstrapBuilder<T> {
        if (isToken(builder)) {
            return container.resolve(builder);
        } else if (builder instanceof BootstrapBuilder) {
            return builder;
        }
        return null;
    }
}
