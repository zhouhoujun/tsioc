import { Token, Type, LoadType, InjectToken, IContainer } from '@ts-ioc/core';
import { AppConfiguration } from './AppConfiguration';
import { IModuleBuilder } from './IModuleBuilder';

/**
 * custom define module.
 */
export type CustomRegister<T> = (container: IContainer, config?: AppConfiguration<T>, builder?: IApplicationBuilder<T>) => Token<any>[] | Promise<Token<any>[]>;

export const ApplicationBuilderToken = new InjectToken<IApplicationBuilder<any>>('DI_AppBuilder');

/**
 * application builder.
 *
 * @export
 * @interface IApplicationBuilder
 * @extends {IModuleBuilder<T>}
 * @template T
 */
export interface IApplicationBuilder<T> extends IModuleBuilder<T> {

    /**
     * use custom configuration.
     *
     * @param {(string | AppConfiguration<T>)} [config]
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    useConfiguration(config?: string | AppConfiguration<T>): this;

    /**
     * use module
     *
     * @param {...LoadType[]} modules
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    use(...modules: LoadType[]): this;

    /**
     * build application.
     *
     * @param {(Token<T> | Type<any> | AppConfiguration<T>)} token
     * @returns {Promise<any>}
     * @memberof IApplicationBuilder
     */
    build(token: Token<T> | Type<any> | AppConfiguration<T>, data?: any): Promise<any>;

    /**
     * register root container
     *
     * @returns {Promise<IContainer>} root container.
     * @memberof IApplicationBuilder
     */
    registerRoot(): Promise<IContainer>;

    /**
     * bootstrap app via main module.
     *
     * @param {(Token<T> | Type<any> | AppConfiguration<T>)} token bootstrap module.
     * @returns {Promise<any>}
     * @memberof IApplicationBuilder
     */
    bootstrap(token: Token<T> | Type<any> | AppConfiguration<T>): Promise<any>;

}
