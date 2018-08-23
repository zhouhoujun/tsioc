import { IModuleValidate, InjectModuleValidateToken } from './IModuleValidate';
import { Type } from '../types';
import { isClass } from '../utils';
import { hasOwnClassMetadata, IocExt } from '../core';

/**
 * base module validate.
 *
 * @export
 * @abstract
 * @class BaseModuelValidate
 * @implements {IModuleValidate}
 */
export abstract class BaseModuelValidate implements IModuleValidate {
    constructor() {

    }

    validate(type: Type<any>): boolean {
        return isClass(type) && hasOwnClassMetadata(this.getDecorator(), type);
    }

    abstract getDecorator(): string;
}

/**
 * IocExt module validate token.
 */
export const IocExtModuleValidateToken = new InjectModuleValidateToken(IocExt.toString());
/**
 * IocExt module validate.
 *
 * @export
 * @class IocExtModuleValidate
 * @extends {BaseModuelValidate}
 * @implements {IModuleValidate}
 */
export class IocExtModuleValidate extends BaseModuelValidate implements IModuleValidate {
    getDecorator(): string {
        return IocExt.toString()
    }
}
