import { Type, Token } from '../types';
import { InjectToken } from '../InjectToken';
import { Registration } from '../Registration';
import { IAnnotationMetadata, IMetaAccessor } from '../core';
import { IContainer } from '../IContainer';

/**
 * module validate.
 *
 * @export
 * @interface IModuleValidate
 */
export interface IModuleValidate {
    /**
     * is right module or not.
     *
     * @param {Type<any>} type
     * @returns {boolean}
     * @memberof IModuleValidate
     */
    validate(type: Type<any>): boolean;

    /**
     * get module metadata config.
     *
     * @param {Token<any>} token
     * @param {IContainer} container
     * @returns {ClassMetadata}
     * @memberof IModuleValidate
     */
    getMetaConfig(token: Token<any>, container: IContainer): IAnnotationMetadata<any>;

    /**
     * get meta accessor.
     *
     * @param {IContainer} container
     * @returns {IMetaAccessor<any>}
     * @memberof IModuleValidate
     */
    getMetaAccessor(container: IContainer): IMetaAccessor<any>;
    /**
     * decorator of the module.
     *
     * @returns {(string | string[])}
     * @memberof IModuleValidate
     */
    getDecorator(): string | string[];
}

/**
 * inject module validate token.
 *
 * @export
 * @class InjectModuleValidateToken
 * @extends {Registration<T>}
 * @template T
 */
export class InjectModuleValidateToken<T extends IModuleValidate> extends Registration<T> {
    constructor(desc: string) {
        super('DI_ModuleValidate', desc)
    }
}

/**
 * Module Validate Token
 */
export const ModuleValidateToken = new InjectToken<IModuleValidate>('DI_ModuleValidate');
