import { Type } from '../types';
import { InjectToken } from '../InjectToken';
import { Registration } from '../Registration';

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
     * decorator of the module.
     *
     * @returns {string}
     * @memberof IModuleValidate
     */
    getDecorator(): string;
}


export class InjectModuleValidateToken<T extends IModuleValidate> extends Registration<T> {
    constructor(desc: string) {
        super('DI_ModuleValidate', desc)
    }
}

/**
 * Module Validate Token
 */
export const ModuleValidateToken = new InjectToken<IModuleValidate>('DI_ModuleValidate');
