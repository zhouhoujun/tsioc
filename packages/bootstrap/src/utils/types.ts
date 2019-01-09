import { isClass, hasOwnClassMetadata } from '@ts-ioc/core';
import { DIModule } from '../decorators';

/**
 * is target di module class or not.
 *
 * @export
 * @param {*} target
 * @returns
 */
export function isDIModuleClass(target: any) {
    return isClass(target) && hasOwnClassMetadata(DIModule, target);
}
