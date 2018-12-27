import { IModuleValidate, InjectModuleValidateToken } from './IModuleValidate';
import { Type } from '../types';
import { isClass, isString, isArray } from '../utils';
import { hasOwnClassMetadata, IocExt } from '../core';

/**
 * base module validate.
 *
 * @export
 * @abstract
 * @class BaseModuelValidate
 * @implements {IModuleValidate}
 */
export class ModuelValidate implements IModuleValidate {
    constructor() {

    }

    valid(type: Type<any>): boolean {
        if (!isClass(type)) {
            return false;
        }

        let decorator = this.getDecorator();
        if (isString(decorator)) {
            return hasOwnClassMetadata(decorator, type);
        } else if (isArray(decorator)) {
            return decorator.some(d => hasOwnClassMetadata(d, type));
        }
        return true;
    }

    getDecorator(): string | string[] {
        return null;
    }
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
 * @extends {ModuelValidate}
 * @implements {IModuleValidate}
 */
export class IocExtModuleValidate extends ModuelValidate implements IModuleValidate {
    getDecorator(): string | string[] {
        return IocExt.toString();
    }
}
