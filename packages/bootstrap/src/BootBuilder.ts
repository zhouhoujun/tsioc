import { IBootBuilder, BootBuilderToken } from './IBootBuilder';
import { Singleton, Token, isToken, IContainer, Inject, ContainerToken, isClass } from '@ts-ioc/core';
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
    // /**
    //  * ioc container.
    //  *
    //  * @type {IContainer}
    //  * @memberof BootBuilder
    //  */
    // @Inject(ContainerToken)
    // container: IContainer;

    constructor(@Inject(ContainerToken) public container: IContainer) {

    }

    async build(token: Token<T>, config: ModuleConfigure, data?: any): Promise<T> {
        let instance = await this.createInstance(token, data);
        instance = await this.buildStrategy(instance, config);
        return instance;
    }

    async buildByConfig(config: Token<T> | ModuleConfigure, data?: any): Promise<any> {
        if (isToken(config)) {
            return this.build(config, null, data);
        } else {
            let token = this.getBootstrapToken(config);
            return this.build(token, config, data);
        }
    }

    async createInstance(token: Token<T>, config: ModuleConfigure, data?: any): Promise<T> {
        if (!token) {
            throw new Error('cant not find bootstrap token.');
        }
        if (!this.container.has(token)) {
            if (isClass(token)) {
                this.container.register(token);
            } else {
                throw new Error(`cant not find token ${token.toString()} in container.`);
            }
        }

        let instance = this.resolveToken(token, data);
        return instance;
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

    protected resolveToken(token: Token<T>, data?: any) {
        return this.container.resolve(token, data);
    }

    protected getBuilderViaConfig(builder: Token<IBootBuilder<T>> | IBootBuilder<T>, container: IContainer): IBootBuilder<T> {
        if (isToken(builder)) {
            return container.resolve(builder);
        } else if (builder instanceof BootBuilder) {
            return builder;
        }
        return null;
    }
}
