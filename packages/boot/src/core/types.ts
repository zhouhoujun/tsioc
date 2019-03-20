import { isClass, hasOwnClassMetadata } from '@ts-ioc/ioc';
import { DIModule } from './decorators/DIModule';


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
