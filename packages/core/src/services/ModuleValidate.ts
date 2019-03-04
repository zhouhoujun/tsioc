import { Type, IocCoreService, isClass, isString, hasOwnClassMetadata, isArray, IocExt } from '@ts-ioc/ioc';

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
 * base module validate.
 *
 * @export
 * @abstract
 * @class BaseModuelValidate
 * @implements {IModuleValidate}
 */
export class ModuelValidate extends IocCoreService implements IModuleValidate {
    constructor() {
        super();
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
