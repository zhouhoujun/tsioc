import { Type, hasOwnClassMetadata, isClass, isBaseType } from '@ts-ioc/core';
import { NonePointcut } from './decorators/NonePointcut';

/**
 * is target can aspect or not.
 *
 * @export
 * @param {Type<any>} targetType
 * @returns {boolean}
 */
export function isValideAspectTarget(targetType: Type<any>): boolean {

    if (!isClass(targetType) || isBaseType(targetType)) {
        return false;
    }


    if (hasOwnClassMetadata(NonePointcut, targetType)) {
        return false;
    }

    return true;
}
