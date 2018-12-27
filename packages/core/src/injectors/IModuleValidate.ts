import { Type } from '../types';
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
    getDecorator(): string | string[];
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
    constructor(decorator: string) {
        super(decorator, 'ModuleValidate');
    }
}

/**
 * Module Validate Token
 */
export const ModuleValidateToken = new InjectModuleValidateToken<IModuleValidate>('');
