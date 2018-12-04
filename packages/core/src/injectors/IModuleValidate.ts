import { Type, Token } from '../types';
import { IAnnotationMetadata, IMetaAccessor } from '../core';
import { IContainer } from '../IContainer';
import { RefRegistration } from '../InjectReference';

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
    valid(type: Type<any>): boolean;

    /**
     * get special decorators of the module.
     *
     * @returns {string}
     * @memberof IModuleValidate
     */
    getDecorator(): string;
}


/**
 * inject module validate token for decorator or class.
 *
 * @export
 * @class InjectMetadataManagerToken
 * @extends {RefRegistration<IMetadataManager>}
 * @template T
 */
export class InjectModuleValidateToken<T extends IModuleValidate> extends RefRegistration<T> {
    constructor(type: Token<any>) {
        super(type, 'ModuleValidate');
    }
}

/**
 * Module Validate Token
 */
export const ModuleValidateToken = new InjectModuleValidateToken<IModuleValidate>(Object);
