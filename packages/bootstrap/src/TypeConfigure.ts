import { Token } from '@ts-ioc/core';
import { ITypeBuilder } from './ITypeBuilder';

/**
 * type build config.
 *
 * @export
 * @interface TypeConfigure
 * @template T
 */
export interface TypeConfigure<T> {
    /**
     * bootstrap via configed token.
     *
     * @type {Token<T>}
     * @memberof TypeConfigure
     */
    bootstrap?: Token<T>;

    /**
     * type builder.
     *
     * @type {(Token<ITypeBuilder<T>> | ITypeBuilder<T>)}
     * @memberof ModuleConfiguration
     */
    typeBuilder?: Token<ITypeBuilder<T>> | ITypeBuilder<T>;
}
